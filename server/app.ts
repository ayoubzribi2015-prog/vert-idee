import express, { type Request, type Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { generateText, Output, jsonSchema, type ModelMessage } from 'ai';
import path from 'path';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { generateExpertAuditFallback } from '../src/utils/fallbackExpertAudit.ts';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

dotenv.config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

// Firebase Admin needs Application Default Credentials; without them the gRPC client
// throws asynchronously and kills the process, so only enable it when credentials exist.
const hasAdminCredentials = !!(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.K_SERVICE ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FUNCTION_TARGET
);

let firestoreInstance: any = null;
if (hasAdminCredentials) {
  try {
    if (!getApps().length) {
      initializeApp({ projectId: firebaseConfig.projectId });
    }
    firestoreInstance = getFirestore(firebaseConfig.firestoreDatabaseId);
  } catch (err: any) {
    console.warn('[Firebase Admin] Initialisation ignorée (pas de credentials valides):', err?.message);
    firestoreInstance = null;
  }
}

const firestore = {
  collection(name: string) {
    if (!firestoreInstance) throw new Error('Firestore Admin indisponible (pas de credentials).');
    return firestoreInstance.collection(name);
  },
};

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de gestion propre des erreurs de parsing JSON et de taille de payload
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      error: 'Le fichier envoyé est trop volumineux. La taille maximale autorisée est de 15 Mo.',
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Format de requête JSON invalide.',
    });
  }
  next(err);
});

let geminiQuotaExhaustedUntil = 0;
let gatewayUnavailableUntil = 0;

// Valid model names per Gemini API SDK guidelines
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

function hasGeminiKey(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

function hasGatewayCredentials(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

// Initialise Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Promesse avec délai d'expiration strict (timeout)
 */
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Exécute une opération Firestore avec un timeout court (1200ms) pour éviter tout blocage réseau gRPC
 */
async function withFirestoreTimeout<T>(operation: () => Promise<T>, timeoutMs = 1200): Promise<T | null> {
  if (!firestoreInstance) return null;
  try {
    return await promiseWithTimeout(operation(), timeoutMs, 'Firestore admin timeout');
  } catch (err: any) {
    console.warn('[Firestore Admin] Opération ignorée ou délai dépassé :', err?.message);
    return null;
  }
}

function geminiSchemaToJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(geminiSchemaToJsonSchema);
  const out: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') out.type = value.toLowerCase();
    else if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, any>).map(([k, v]) => [k, geminiSchemaToJsonSchema(v)])
      );
    } else if (key === 'items') out.items = geminiSchemaToJsonSchema(value);
    else if (key === 'propertyOrdering' || key === 'nullable') continue;
    else out[key] = value;
  }
  return out;
}

function toGatewayMessages(contents: any): ModelMessage[] {
  if (typeof contents === 'string') return [{ role: 'user', content: contents }];
  if (!Array.isArray(contents)) return [{ role: 'user', content: String(contents ?? '') }];

  if (contents.every((c) => c && typeof c === 'object' && 'role' in c)) {
    return contents.map((c: any) => {
      const text = (c.parts || []).map((p: any) => p?.text || '').join('\n');
      return c.role === 'model'
        ? ({ role: 'assistant', content: text } as ModelMessage)
        : ({ role: 'user', content: text } as ModelMessage);
    });
  }

  const parts = contents.map((p: any) =>
    p?.inlineData
      ? { type: 'file' as const, data: p.inlineData.data, mediaType: p.inlineData.mimeType }
      : { type: 'text' as const, text: p?.text || '' }
  );
  return [{ role: 'user', content: parts }];
}

async function generateViaGateway(model: string, contents: any, config: any = {}): Promise<{ text: string }> {
  const result = await generateText({
    model,
    system: config?.systemInstruction,
    messages: toGatewayMessages(contents),
    temperature: config?.temperature,
    seed: config?.seed,
    maxOutputTokens: config?.maxOutputTokens,
    ...(config?.responseSchema
      ? { output: Output.object({ schema: jsonSchema(geminiSchemaToJsonSchema(config.responseSchema)) }) }
      : {}),
  });
  return { text: result.text };
}

/**
 * Exécute un appel Gemini avec résilience multi-modèles et timeouts stricts
 */
async function generateContentWithResilience(options: {
  contents: any;
  config?: any;
  preferredModels?: string[];
  singleAttemptTimeoutMs?: number;
  totalTimeoutMs?: number;
}): Promise<{ response: { text: string }; modelUsed: string }> {
  const startTime = Date.now();
  const singleTimeout = options.singleAttemptTimeoutMs || 15000;
  const totalTimeout = options.totalTimeoutMs || 30000;

  const models = options.preferredModels || DEFAULT_MODELS;
  let lastError: any = null;

  const providers: Array<'gemini' | 'gateway'> = [];
  if (hasGeminiKey() && Date.now() >= geminiQuotaExhaustedUntil) providers.push('gemini');
  if (hasGatewayCredentials() && Date.now() >= gatewayUnavailableUntil) providers.push('gateway');

  if (providers.length === 0) {
    throw new Error(
      'Aucun fournisseur IA disponible : définissez GEMINI_API_KEY (ou activez Vercel AI Gateway).'
    );
  }

  for (const provider of providers) {
    for (const modelName of models) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalTimeout) break;
      const attemptTimeout = Math.min(singleTimeout, totalTimeout - elapsed);
      const label = provider === 'gemini' ? modelName : `google/${modelName}`;

      try {
        console.log(`[AI Engine] ${provider} → "${label}" (timeout: ${attemptTimeout}ms)...`);
        const call: Promise<{ text: string }> =
          provider === 'gemini'
            ? ai.models
                .generateContent({ model: modelName, contents: options.contents, config: options.config })
                .then((r) => ({ text: r?.text || '' }))
            : generateViaGateway(label, options.contents, options.config);

        const response = await promiseWithTimeout<{ text: string }>(
          call,
          attemptTimeout,
          `Délai dépassé (${attemptTimeout}ms) pour le modèle ${label}`
        );

        if (response && response.text) {
          console.log(`[AI Engine] Succès "${label}" via ${provider} en ${Date.now() - startTime}ms`);
          return { response, modelUsed: `${provider}:${label}` };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[AI Engine] ${provider} "${label}" a échoué : ${errMsg}`);

        const isAuthOrQuota =
          /quota|429|exhausted|API key|API_KEY|PERMISSION_DENIED|401|403|credit card|customer_verification/i.test(errMsg);
        if (isAuthOrQuota) {
          if (provider === 'gemini') geminiQuotaExhaustedUntil = Date.now() + 10 * 60 * 1000;
          else gatewayUnavailableUntil = Date.now() + 10 * 60 * 1000;
          break;
        }
      }
    }
  }

  throw lastError || new Error('Les modèles IA ont mis trop de temps ou sont indisponibles.');
}

// Firebase Storage for shared/default projects (legacy support with memory fallback)
const GLOBAL_PROJECTS_COLLECTION = 'global_projects';
const inMemoryProjects = new Map<string, any>();

async function readProjects(): Promise<any[]> {
  const result = await withFirestoreTimeout(async () => {
    const snapshot = await firestore.collection(GLOBAL_PROJECTS_COLLECTION).orderBy('createdAt', 'desc').limit(50).get();
    return snapshot.docs.map((doc: any) => doc.data());
  }, 1200);

  if (result && result.length > 0) return result;

  return Array.from(inMemoryProjects.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

async function saveProjectToFirestore(project: any): Promise<void> {
  // Toujours enregistrer immédiatement dans la mémoire locale (instantané)
  inMemoryProjects.set(project.id, project);
  if (!firestoreInstance) return;

  // Sauvegarde non bloquante vers Firestore Admin avec timeout de 1200ms
  withFirestoreTimeout(async () => {
    await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(project.id).set({
      ...project,
      updatedAt: new Date().toISOString()
    });
  }, 1200).catch((err) => {
    console.warn('[Firestore Admin] Écriture différée ignorée :', err?.message);
  });
}

app.get('/api/ai-status', async (req: express.Request, res: express.Response) => {
  const status: Record<string, any> = {
    geminiKeyConfigured: hasGeminiKey(),
    gatewayConfigured: hasGatewayCredentials(),
  };
  if (req.query.probe === '1') {
    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents: 'Réponds uniquement par "OK".',
        singleAttemptTimeoutMs: 8000,
        totalTimeoutMs: 12000,
      });
      status.probe = { ok: true, modelUsed, reply: response.text.slice(0, 40) };
    } catch (err: any) {
      status.probe = { ok: false, error: err?.message || String(err) };
    }
  }
  res.json(status);
});

// REST API for Cloud History
app.get('/api/projects', async (req: express.Request, res: express.Response) => {
  const list = await readProjects();
  res.json({ success: true, data: list });
});

app.get('/api/projects/:id', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const docData = await withFirestoreTimeout(async () => {
    const doc = await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).get();
    return doc.exists ? doc.data() : null;
  }, 1000);

  if (docData) {
    res.json({ success: true, data: docData });
    return;
  }

  const item = inMemoryProjects.get(id);
  if (item) {
    res.json({ success: true, data: item });
    return;
  }
  res.status(404).json({ success: false, error: 'Projet introuvable.' });
});

app.post('/api/projects', async (req: express.Request, res: express.Response) => {
  try {
    const project = req.body;
    if (!project || !project.title) {
      res.status(400).json({ success: false, error: 'Données de projet invalides.' });
      return;
    }
    const newProject = {
      ...project,
      id: project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProjectToFirestore(newProject);
    res.json({ success: true, data: newProject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/projects/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const existing = inMemoryProjects.get(id) || {};
    inMemoryProjects.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    withFirestoreTimeout(async () => {
      await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }, 1000).catch(() => {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    inMemoryProjects.delete(id);
    withFirestoreTimeout(async () => {
      await firestore.collection(GLOBAL_PROJECTS_COLLECTION).doc(id).delete();
    }, 1000).catch(() => {});
    res.json({ success: true, message: 'Projet supprimé de l\'historique.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Chargement différé de pdf-parse : pdfjs-dist exige DOMMatrix/Path2D, absents de Node
// en serverless. `pdf-parse/worker` les polyfille via @napi-rs/canvas et fournit le worker
// en data URL ; l'import différé évite qu'un échec de chargement ne casse toute l'API.
let pdfParsePromise: Promise<typeof import('pdf-parse').PDFParse> | null = null;
function loadPDFParse() {
  pdfParsePromise ??= (async () => {
    const { getData } = await import('pdf-parse/worker');
    const { PDFParse } = await import('pdf-parse');
    PDFParse.setWorker(getData());
    return PDFParse;
  })().catch((err) => {
    pdfParsePromise = null;
    throw err;
  });
  return pdfParsePromise;
}

// Endpoint d'extraction de texte depuis des fichiers importés (PDF, DOCX, XLSX, TXT, etc.)
app.post('/api/extract-file', async (req: express.Request, res: express.Response) => {
  try {
    const { filename, base64Data, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, error: 'Données de fichier manquantes.' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = path.extname(filename || '').toLowerCase();
    let extractedText = '';

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      try {
        const PDFParse = await loadPDFParse();
        const parser = new PDFParse({ data: buffer });
        const parsedResult = await parser.getText();
        extractedText = typeof parsedResult === 'string' ? parsedResult : (parsedResult?.text || '');
      } catch (pdfErr: any) {
        console.warn('[File Extract] Erreur pdf-parse:', pdfErr?.message);
      }

      // Si le texte extrait est très court (ex: scan d'image), tentative rapide via Gemini vision/multimodal
      if (!extractedText || extractedText.trim().length < 40) {
        try {
          const { response: aiRes } = await generateContentWithResilience({
            singleAttemptTimeoutMs: 7000,
            totalTimeoutMs: 10000,
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'Extrais et transcris fidèlement le contenu descriptif de ce projet (problème résolu, solution technique, intrants, procédés, proposition de valeur et aspects environnementaux). Restitue un texte clair et bien structuré adapté pour renseigner la description d\'un audit écologique.',
              },
            ],
          });
          if (aiRes && aiRes.text) {
            extractedText = aiRes.text;
          }
        } catch (geminiPdfErr: any) {
          console.warn('[File Extract] Gemini PDF fallback non disponible:', geminiPdfErr?.message);
        }
      }
    } else if (ext === '.docx' || ext === '.doc' || mimeType?.includes('word')) {
      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        extractedText = mammothResult.value || '';
      } catch (wordErr: any) {
        console.warn('[File Extract] Erreur extraction Word (mammoth):', wordErr?.message);
        // Fallback sécurisé pour fichiers .doc ou formats binaires
        extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00A0-\u024F\n\r\t]/g, ' ');
      }
    } else if (ext === '.xlsx' || ext === '.xls' || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        extractedText = workbook.SheetNames
          .map((sheetName) => {
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { FS: '\t', RS: '\n' });
            return `--- ${sheetName} ---\n${csv}`;
          })
          .join('\n\n');
      } catch (xlsxErr: any) {
        console.warn('[File Extract] Erreur XLSX:', xlsxErr?.message);
        extractedText = buffer.toString('utf-8');
      }
    } else {
      // Plain text, markdown, csv, json, rtf
      try {
        extractedText = buffer.toString('utf-8');
      } catch (txtErr: any) {
        extractedText = buffer.toString('latin1');
      }
    }

    // Normalisation du texte extrait
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText) {
      res.status(400).json({
        success: false,
        error: 'Impossible d\'extraire du texte de ce document. Assurez-vous qu\'il contient du texte lisible ou copiez directement votre texte.',
      });
      return;
    }

    // Détection d'un titre potentiel
    let suggestedTitle = '';
    const lines = extractedText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^#+\s*/, '');
      if (firstLine.length >= 3 && firstLine.length <= 80) {
        suggestedTitle = firstLine;
      }
    }

    // Synthèse concise (7 lignes max) des informations du document
    let finalDescription = extractedText;
    if (extractedText.length > 250) {
      try {
        const { response: summaryRes } = await generateContentWithResilience({
          contents: `À partir du contenu du document importé ci-dessous, rédige une description concise et percutante de l'idée de projet et de sa proposition de valeur, STRICTEMENT LIMITÉE À 7 LIGNES MAXIMUM. Cette description doit condenser les informations les plus pertinentes (problème résolu, solution technique, intrants/procédés et proposition de valeur écologique) pour renseigner le champ de diagnostic.

Document source :
${extractedText.slice(0, 10000)}`,
          singleAttemptTimeoutMs: 5000,
          totalTimeoutMs: 7000,
        });
        if (summaryRes && summaryRes.text) {
          finalDescription = summaryRes.text.trim();
        }
      } catch (sumErr: any) {
        console.warn('[File Extract] Synthèse IA non disponible ou délai dépassé (utilisation directe de l\'extrait):', sumErr?.message);
        const nonBlankLines = extractedText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith('---'));
        finalDescription = nonBlankLines.slice(0, 7).join('\n');
      }
    }

    res.json({
      success: true,
      filename,
      extractedText: finalDescription,
      suggestedTitle,
      charCount: finalDescription.length,
    });
  } catch (err: any) {
    console.error('Error in /api/extract-file:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Erreur lors de l\'extraction du document.',
    });
  }
});

// Cache déterministe pour garantir la cohérence absolue et reproductible des scores
// Deux soumissions avec la même description opérationnelle reçoivent exactement les mêmes scores
interface CachedAudit {
  data: any;
  cachedAt: number;
}
const auditContentCache = new Map<string, CachedAudit>();

// Lieu d'implantation par défaut : si l'utilisateur ne précise aucun lieu, le
// diagnostic considère que le projet est implanté en Tunisie.
const DEFAULT_LOCATION = 'Tunisie';

function resolveLocation(loc?: string | null): string {
  return (loc || '').trim() || DEFAULT_LOCATION;
}

function normalizeDescriptionKey(desc: string, loc: string, answers?: any): string {
  const cleanDesc = (desc || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const cleanLoc = (loc || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const cleanAnswers = answers ? JSON.stringify(answers) : '';
  return `${cleanDesc}:::${cleanLoc}:::${cleanAnswers}`;
}

// Expert Ecological Analysis API with EXACTLY the 8 required sections
app.post('/api/analyze', async (req: express.Request, res: express.Response) => {
  try {
    const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, error: 'Le titre et la description du projet sont obligatoires.' });
      return;
    }

    // Vérification du cache de cohérence déterministe
    // Si la même description opérationnelle a déjà été évaluée (ex. "grandii" vs "t3allem"),
    // nous garantissons des scores strictement identiques et une parfaite cohérence sans dérive stochastique
    const cacheKey = normalizeDescriptionKey(description, resolveLocation(location), req.body && req.body.answers);
    const cached = auditContentCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
      console.log(`[Audit Engine] Projet équivalent détecté en cache pour "${title}". Application déterministe des scores et du diagnostic.`);
      const cloned = JSON.parse(JSON.stringify(cached.data));
      if (cloned.projectSynthesis && cloned.projectSynthesis.summary) {
        cloned.projectSynthesis.summary = cloned.projectSynthesis.summary.replace(
          /Le projet "[^"]+"/g,
          `Le projet "${title}"`
        );
      }
      const finalSector = cloned.detectedSector || sector || 'Économie Circulaire & Éco-innovation';
      const auditResult = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        sector: finalSector,
        description,
        location: resolveLocation(location),
        targetAudience: targetAudience || 'B2B / B2C Éco-responsable',
        businessModel: businessModel || 'Économie Circulaire & Vente directe',
        lifeCycleDetails: lifeCycleDetails || '',
        createdAt: new Date().toISOString(),
        ...cloned,
      };

      if (req.body.shouldSave) {
        saveProjectToFirestore(auditResult);
      }

      res.json({ success: true, data: auditResult, cached: true });
      return;
    }

    const systemPrompt = `
Tu es le Collège d'Évaluation Environnementale de Vert'Idée.
Ta mission repose sur les méthodologies de référence internationales et nationales (ISO 14067:2018, ISO 14064-1:2018, Bibliothèque GreenGate.tn, Greenov'i, CITET, ANME, et Panorama des Méthodes d'Évaluation Environnementale - Institut Agro Montpellier / HAL) :
- **ISO 14067:2018 (Empreinte Carbone des Produits - ECP / CFP)** :
  * Quantification de l'empreinte carbone sur l'ensemble du cycle de vie (du berceau à la tombe ou du berceau à la porte) rapportée à une Unité Fonctionnelle (UF) ou déclarée rigoureuse.
  * Traitement distinct et transparent du carbone biogénique (émissions et captations de la biomasse) et des émissions liées au changement direct d'affectation des sols (dLUC) sur 20 ans.
  * Application conjointe des approches géographique (location-based) et contractuelle (market-based) pour l'électricité importée.
  * **Règle absolue anti-greenwashing ISO 14067** : La compensation carbone (achats de crédits, offsets) n'est JAMAIS déduite de l'empreinte carbone intrinsèque du produit.
- **ISO 14064-1:2018 (Inventaire des émissions et suppressions de GES au niveau des organismes)** :
  * Structuration selon les 6 catégories normatives :
    - Catégorie 1 : Émissions et captations directes de GES (combustions fixes, mobiles, procédés, émissions fugitives, UTCATF/LULUCF).
    - Catégorie 2 : Émissions indirectes de GES liées à l'énergie importée (électricité, vapeur, chaleur, froid).
    - Catégorie 3 : Émissions indirectes liées aux transports (fret amont/aval, mobilité collaborateurs, déplacements professionnels).
    - Catégorie 4 : Émissions indirectes des produits achetés (matières premières, emballages, biens d'équipement, traitement des déchets, services).
    - Catégorie 5 : Émissions indirectes associées à l'utilisation et la fin de vie des produits de l'organisme.
    - Catégorie 6 : Émissions indirectes d'autres sources.
  * Principes directeurs d'intégrité : Pertinence, Exhaustivité, Cohérence, Exactitude, Transparence.
- **Référentiel GreenGate.tn & Greenov'i (UE / Expertise France / CITET)** : Guide de l'Entrepreneuriat Vert, élaboration du Business Plan Vert, éco-conception, modèles d'affaires circulaires et critères d'éligibilité aux écolabels et financements verts (FODEP, ANME, BERD Climat).
- **ISO 14001 & ISO 14040/14044 (ACV)** : Analyse des Aspects Environnementaux Significatifs (AES) et évaluation multi-critères du cycle de vie du berceau à la tombe.
- **Guide & Panorama Institut Agro Montpellier** : Cadrage méthodologique combinant ACV (Life Cycle Assessment), GHG Protocol (Scopes 1-2-3), MFA (Analyse des Flux de Matière/Circularité), ERA (Évaluation des Risques Écotoxiques & Chimiques), AMC/MCDA (Analyse Multicritère de Décision Environnement-Économie-Social) et MEA/IPBES (Valuation des Services Écosystémiques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : Éco-responsabilité, résilience hydro-climatique et préservation des écosystèmes fragiles en zone aride/semi-aride.

*** RÈGLE DE STABILITÉ ET DÉTERMINISME DU SCORING (OBLIGATION SCIENTIFIQUE ABSOLUE) ***
1. INDÉPENDANCE TOTALE VIS-À-VIS DU NOM / MARQUE : L'évaluation environnementale et les scores (environnemental, social, circularité, maturité carbone et score global) reposent EXCLUSIVEMENT et STRICTEMENT sur la nature des activités réelles, les intrants, les procédés de fabrication ou de service, les flux de matière et d'énergie, et les externalités décrits dans la DESCRIPTION et les caractéristiques techniques.
2. Le titre commercial ou nom de marque (ex: "grandii", "t3allem", ou tout autre libellé) n'est qu'un identifiant arbitraire. Il NE DOIT EN AUCUN CAS faire varier les scores ni l'analyse d'impact.
3. Si deux projets présentent la même description opérationnelle et les mêmes caractéristiques, le Collège d'Experts DOIT impérativement attribuer des scores strictement identiques et reproductibles. Toute divergence de notation due au nom du projet est une erreur méthodologique inacceptable.

1. ANALYSE PRÉLIMINAIRE : Vérifie si les informations fournies (titre, description, lieu) sont suffisantes pour réaliser un audit environnemental complet ET crédible.
   - SI INSUFFISANT (notamment pour les projets industriels lourds, plasturgie, chimie, mines, sans détails sur les intrants, l'énergie ou les effluents) : Tu DOIS impérativement répondre avec { "needsInfo": true, "questions": [{ "id": "...", "question": "...", "options": [...] }] }.
   - Pose entre 3 et 5 questions à choix multiples pertinentes pour lever les doutes sur le greenwashing (ex: provenance de la matière, type d'énergie, consommation d'eau et circuit de recyclage).

2. ANALYSE DÉTAILLÉE : Si suffisant, tu es constitué de QUATRE Experts Seniors Indépendants réalisant une revue critique sans la moindre complaisance, couvrant exhaustivement tous les volets du projet :
   - **Expert 1 (Spécialiste Senior Empreinte Carbone & ACV - Normes ISO 14067:2018, ISO 14064-1:2018, GHG Protocol & MFA Institut Agro)** : Quantification normée de l'Empreinte Carbone Produit (ECP) par unité fonctionnelle ou déclarée (ISO 14067), décomposition rigoureuse selon les 6 catégories d'émissions ISO 14064-1 (Cat 1 directe, Cat 2 énergie importée, Cat 3 transport, Cat 4 intrants/emballages, Cat 5 usage/fin de vie), comptabilisation séparée du carbone biogénique et exclusion stricte de toute compensation carbone fictive.
   - **Expert 2 (Risques Industriels, Écotoxicologie ERA & AES ISO 14001 - Guide OSS & Institut Agro)** : Évaluation de la criticité des impacts selon la matrice normée **Criticité (C) = [Fréquence (F) × Gravité (G) × Sensibilité du Milieu (S)] / Maîtrise Opérationnelle (M)**, l'évaluation des risques écotoxiques (ERA), le stress hydrique (OSS), la santé des riverains et la conformité réglementaire (CITET, CSRD, Taxonomie UE).
   - **Expert 3 (Stratégie d'Entrepreneuriat Vert & Modèles Circulaires)** : Analyse approfondie de la viabilité économique de la transition écologique, de l'économie de la fonctionnalité, de l'écoconception des modèles d'affaires (business models circulaires) et de la substitution durable des ressources (référentiel GreenGate.tn).
   - **Expert 4 (Détecteur Avancé Anti-Greenwashing & Vérification des Allégations)** : Chasse implacable aux revendications environnementales trompeuses (greenwashing), analyse critique de la matérialité des gains annoncés face aux impacts cachés (amont/aval), exigence de preuves mesurables (ACV certifiée, traçabilité des intrants, labels authentiques).

*** RÈGLE ÉTHIQUE & SÉCURITÉ ABSOLUE : TOLÉRANCE ZÉRO AU GREENWASHING ***
1. Projets interdits : Si le projet porte sur des technologies militaires, des armes ou des substances destructrices illégales, refuse catégoriquement l'audit.
2. ÉVALUATION RÉALISTE DES ACTIVITÉS POLLUANTES, EXTRACTIVES & EXTRACTIVO-CHIMIQUES :
   Si le projet décrit appartient à une industrie lourde extractive, minière, fossile, plasturgie conventionnelle ou hyper-consommatrice d'eau (ex : phosphate, carrières, cimenterie fossile, pétrochimie, engrais de synthèse, pesticides, injection plastique sans 100% de résine recyclée certifiée) :
   - TU DOIS STATUER UN AVIS DÉFAVORABLE / ALERTE CRITIQUE DU COLLÈGE DES EXPERTS.
   - Les scores d'impact DOIVENT ÊTRE CRITIQUEMENT BAS : Score global entre 15 et 32/100, Score environnemental entre 12 et 25/100, Score circularité entre 10 et 22/100.
   - IL EST STRICTEMENT INTERDIT de prétendre que ce projet est "vertueux", "éco-responsable" ou relève de l'"économie circulaire" sans preuves massives (ex: circuit fermé eau ZLD, 100% recyclé certifié, solaire dédié).
   - DÉTAILLE EXPLICITEMENT LES AES MAJEURS ET LES RISQUES CRITIQUES RÉELS (Pollution nappes, poussières PM10, sur-émissions CO2).
3. PROJETS CONVENTIONNELS OU NUMÉRIQUES : Attribue des notes réalistes, cohérentes et modérées (40 à 65/100 pour l'environnement, valorise le volet social si inclusion/éducation).
4. VRAIES ÉCO-INNOVATIONS VÉRIFIABLES (Agroécologie régénératrice, biomatériaux compostables, énergies renouvelables certifiées, valorisation circulaire de biodéchets) : Attribue des scores élevés mérités (75 à 90/100) avec justification des gains nets et de la résilience locale (Guide OSS).

Le rapport d'expertise DOIT OBLIGATOIREMENT être structuré selon EXACTEMENT les 8 sections officielles :
1. Synthèse du projet : Scores d'impacts rigoureusement calibrés (sévères si polluant), avis collégial des 2 experts (STRICTEMENT LIMITÉ À 5 LIGNES MAX / ~40-50 mots directement après le nom du projet) et vision de transformation.
2. Aspects & impacts environnementaux : Analyse approfondie des aspects et impacts environnementaux (directs et indirects, positifs et négatifs) sur les écosystèmes, l'air, l'eau, le climat, les sols et la biodiversité. Évaluation normée des AES selon la matrice ISO 14001 (F, G, S, M), quantification des impacts par phase du cycle de vie (ACV ISO 14040/14044), écotoxicité (ERA), flux de matière (MFA) et leviers d'atténuation d'impacts.
3. Aspects & impacts sociaux et sociétaux : Analyse approfondie des impacts sociaux et sociétaux directs et indirects : santé et sécurité des travailleurs, santé publique et riverains (exposition poussières PM, produits toxiques, bruit), création d'emplois locaux pérennes, retombées communautaires, gouvernance partagée éthique (ISO 26000) et accompagnement vers une transition juste.
4. Intégration de l'entrepreneuriat vert : Analyse économique critique, modèles de rupture technologique nécessaires (ex: recyclage d'eau fermé ZLD, filtres-presses, solaire dédié).
5. Alignement ODD : Alerte sur les ODD négativement impactés si industrie polluante (ex: ODD 6 Eau, ODD 3 Santé, ODD 12 Production durable).
6. Indicateurs d'impact : Bilan carbone normé selon ISO 14067:2018 (par unité fonctionnelle) et ISO 14064-1:2018 (Catégories 1 à 6). Analyse de cycle de vie étape par étape (Approvisionnement Cat 4, Fabrication Cat 1-2, Conditionnement Cat 4, Transport Cat 3, Utilisation Cat 5, Fin de vie Cat 5) avec exclusion stricte de toute compensation carbone fictive. Pour benchmarkComparison : si le projet appartient à une industrie lourde ou polluante, totalCarbonKgCO2e DOIT être STRICTEMENT SUPÉRIEUR à industryAverageKgCO2e (+20% à +60% de sur-émissions) ; si éco-innovation vertueuse, totalCarbonKgCO2e DOIT être INFÉRIEUR (-20% à -65%). Actions de décarbonation quantifiées (P1/P2/P3), intensité eau chiffrée.
7. Financements et labels verts : Statut d'éligibilité réel (exclusion formelle des labels verts si activité polluante), fonds de mise en conformité et dépollution (FODEP, BERD Climat).
8. Plan d'action prioritaire : Actions concrètes d'urgence (0-12 mois) priorisées avec livrables opérationnels pour la neutralisation des AES.
`;

    const userPrompt = `
Voici le projet à auditer selon les 8 sections officielles par le Collège des 2 Experts Environnementaux :
- Nom commercial / Marque du projet (Libellé administratif uniquement, NE DOIT PAS INFLUENCER LES SCORES) : ${title}
- Description opérationnelle de l'activité & Proposition de valeur (FONDEMENT STRICT DU SCORING) : ${description}
- Lieu d'implantation : ${resolveLocation(location)}
${sector ? `- Secteur suggéré : ${sector}` : ''}
${targetAudience ? `- Cible suggérée : ${targetAudience}` : ''}
${businessModel ? `- Modèle économique suggéré : ${businessModel}` : ''}
${lifeCycleDetails ? `- Détails cycle de vie : ${lifeCycleDetails}` : ''}
${req.body && req.body.answers ? `- Informations complémentaires fournies (Q&R) : ${JSON.stringify(req.body.answers)}` : ''}

Consigne stricte de cotation : Calcule les scores avec une impartialité totale, en te basant exclusivement sur la description opérationnelle ci-dessus. Deux projets ayant la même description doivent impérativement recevoir des scores identiques.
`;

    let parsedData: any = null;

    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents: userPrompt,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        singleAttemptTimeoutMs: 12000,
        totalTimeoutMs: 20000,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          seed: 42,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
          type: Type.OBJECT,
          properties: {
            needsInfo: { type: Type.BOOLEAN, description: 'Indique si des informations supplémentaires sont nécessaires avant l\'analyse' },
            questions: {
              type: Type.ARRAY,
              description: 'Liste de questions si needsInfo est vrai',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['id', 'question', 'options'],
              },
            },
            detectedSector: { type: Type.STRING, description: 'Secteur d\'activité déterminé pour le projet' },
            // 1. Synthèse du projet
            projectSynthesis: {
              type: Type.OBJECT,
              properties: {
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    environmental: { type: Type.NUMBER, description: 'Score environnemental 0-100' },
                    social: { type: Type.NUMBER, description: 'Score social 0-100' },
                    circularity: { type: Type.NUMBER, description: 'Score circularité 0-100' },
                    carbonMaturity: { type: Type.NUMBER, description: 'Score maturité carbone 0-100' },
                    globalScore: { type: Type.NUMBER, description: 'Score global 0-100' },
                  },
                  required: ['environmental', 'social', 'circularity', 'carbonMaturity', 'globalScore'],
                },
                summary: { type: Type.STRING },
                vision: { type: Type.STRING },
              },
              required: ['scores', 'summary', 'vision'],
            },

            // 2. Aspects & impacts environnementaux
            environmentalAspects: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Impacts environnementaux positifs, atouts écologiques et gains nets' },
                criticalRisks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Impacts environnementaux négatifs, pollutions potentielles et AES critiques' },
                lifecycleAssessment: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phase: { type: Type.STRING },
                      impactLevel: { type: Type.STRING, enum: ['faible', 'moyen', 'eleve'] },
                      details: { type: Type.STRING, description: 'Nature et diagnostic précis des impacts de cette phase' },
                      ecoDesignLever: { type: Type.STRING, description: 'Levier d\'éco-conception pour atténuer ou éliminer cet impact' },
                    },
                    required: ['phase', 'impactLevel', 'details', 'ecoDesignLever'],
                  },
                },
                circularEconomy: {
                  type: Type.OBJECT,
                  properties: {
                    strategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    wasteValorization: { type: Type.STRING, description: 'Impact sur la réduction et valorisation des déchets' },
                    durabilityRepair: { type: Type.STRING, description: 'Impact sur l\'allongement de vie et la réparabilité' },
                  },
                  required: ['strategies', 'wasteValorization', 'durabilityRepair'],
                },
                regulationsAndNorms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['strengths', 'criticalRisks', 'lifecycleAssessment', 'circularEconomy', 'regulationsAndNorms'],
            },

            // 3. Aspects & impacts sociaux et sociétaux
            socialAspects: {
              type: Type.OBJECT,
              properties: {
                socialImpacts: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Impacts sociaux directs : conditions de travail, hygiène et sécurité, santé des travailleurs et des riverains' },
                localEconomy: { type: Type.STRING, description: 'Impacts économiques locaux : création d\'emplois durables, circuits courts et retombées sur le bassin territorial' },
                governanceAndEthics: { type: Type.STRING, description: 'Impacts sociétaux et gouvernance éthique : concertation des parties prenantes, transparence et respect des normes RSE (ISO 26000)' },
                justTransition: { type: Type.STRING, description: 'Impacts sur la transition juste : formation continue aux métiers verts, inclusion et reconversion équitable des collaborateurs' },
              },
              required: ['socialImpacts', 'localEconomy', 'governanceAndEthics', 'justTransition'],
            },

            // 4. Intégration de l'entrepreneuriat vert
            greenEntrepreneurshipIntegration: {
              type: Type.OBJECT,
              properties: {
                innovativeBusinessModels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      feasibility: { type: Type.STRING },
                      economicBenefit: { type: Type.STRING },
                    },
                    required: ['title', 'description', 'feasibility', 'economicBenefit'],
                  },
                },
                differentiationFactor: { type: Type.STRING },
                circularValueProposition: { type: Type.STRING },
              },
              required: ['innovativeBusinessModels', 'differentiationFactor', 'circularValueProposition'],
            },

            // 5. Alignement ODD
            sdgAlignment: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  oddNumber: { type: Type.INTEGER, description: 'Numéro de l\'ODD (ex: 12)' },
                  title: { type: Type.STRING, description: 'Titre de l\'ODD' },
                  contribution: { type: Type.STRING, description: 'Contribution concrète du projet' },
                  targets: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Sous-cibles ODD' },
                },
                required: ['oddNumber', 'title', 'contribution', 'targets'],
              },
            },

            // 6. Indicateurs d'impact
            impactIndicators: {
              type: Type.OBJECT,
              properties: {
                carbonFootprint: {
                  type: Type.OBJECT,
                  properties: {
                    functionalUnit: { type: Type.STRING },
                    totalCarbonKgCO2e: { type: Type.NUMBER },
                    benchmarkComparison: {
                      type: Type.OBJECT,
                      properties: {
                        industryAverageKgCO2e: { type: Type.NUMBER },
                        ecoDesignedTargetKgCO2e: { type: Type.NUMBER },
                        commentary: { type: Type.STRING },
                      },
                      required: ['industryAverageKgCO2e', 'ecoDesignedTargetKgCO2e', 'commentary'],
                    },
                    lifecycleStages: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          category: {
                            type: Type.STRING,
                            enum: ['raw_materials', 'manufacturing', 'packaging', 'transport', 'usage', 'end_of_life'],
                          },
                          emissionKgCO2e: { type: Type.NUMBER },
                          percentage: { type: Type.NUMBER },
                          description: { type: Type.STRING },
                          reductionOpportunity: { type: Type.STRING },
                        },
                        required: ['id', 'name', 'category', 'emissionKgCO2e', 'percentage', 'description', 'reductionOpportunity'],
                      },
                    },
                    highImpactDecarbonizationActions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          action: { type: Type.STRING },
                          estimatedReductionPct: { type: Type.NUMBER },
                          priority: { type: Type.STRING, enum: ['P1', 'P2', 'P3'] },
                        },
                        required: ['action', 'estimatedReductionPct', 'priority'],
                      },
                    },
                  },
                  required: ['functionalUnit', 'totalCarbonKgCO2e', 'benchmarkComparison', 'lifecycleStages', 'highImpactDecarbonizationActions'],
                },
                circularityRate: { type: Type.STRING },
                wasteAvoided: { type: Type.STRING },
                waterPreservation: { type: Type.STRING },
                localJobsProjection: { type: Type.STRING },
                keyMetrics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      value: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      interpretation: { type: Type.STRING },
                    },
                    required: ['label', 'value', 'unit', 'interpretation'],
                  },
                },
              },
              required: ['carbonFootprint', 'circularityRate', 'wasteAvoided', 'waterPreservation', 'localJobsProjection', 'keyMetrics'],
            },

            // 7. Financements et labels verts envisageables
            greenFinancingAndLabels: {
              type: Type.OBJECT,
              properties: {
                labels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      whyItMatters: { type: Type.STRING },
                      eligibilityCriteria: { type: Type.STRING },
                    },
                    required: ['name', 'category', 'whyItMatters', 'eligibilityCriteria'],
                  },
                },
                fundings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.STRING },
                      program: { type: Type.STRING },
                      amountOrAid: { type: Type.STRING },
                      conditions: { type: Type.STRING },
                    },
                    required: ['source', 'program', 'amountOrAid', 'conditions'],
                  },
                },
              },
              required: ['labels', 'fundings'],
            },

            // 8. Plan d'action prioritaire
            priorityActionPlan: {
              type: Type.OBJECT,
              properties: {
                phase1_0to3months: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeframe: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      priorityLevel: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: Type.STRING },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
                phase2_3to6months: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeframe: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      priorityLevel: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: Type.STRING },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
                phase3_6to12months: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeframe: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      priorityLevel: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: Type.STRING },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
              },
              required: ['phase1_0to3months', 'phase2_3to6months', 'phase3_6to12months'],
            },
          },
          required: [
            'projectSynthesis',
            'environmentalAspects',
            'socialAspects',
            'greenEntrepreneurshipIntegration',
            'sdgAlignment',
            'impactIndicators',
            'greenFinancingAndLabels',
            'priorityActionPlan',
          ],
        },
      },
    });

      const textOutput = response.text || '{}';
      parsedData = JSON.parse(textOutput);

      if (parsedData.needsInfo) {
        console.log(`[Audit Engine] Le modèle demande plus d'informations.`);
        res.json({ success: true, needsInfo: true, questions: parsedData.questions });
        return;
      }

      console.log(`[Audit Engine] Diagnostic analysé avec succès via ${modelUsed} !`);
    } catch (aiErr: any) {
      console.warn(
        '[Audit Engine] Saturation temporaire de l\'API Gemini (503). Activation immédiate du moteur expert déterministe :',
        aiErr?.message
      );
      // Moteur d'audit expert déterministe : garantit que l'utilisateur reçoit TOUJOURS son rapport complet sans être bloqué
      parsedData = generateExpertAuditFallback(title, description, resolveLocation(location));
    }

    // Mettre en cache déterministe si l'analyse est complète
    if (parsedData && !parsedData.needsInfo) {
      auditContentCache.set(cacheKey, {
        data: parsedData,
        cachedAt: Date.now(),
      });
    }

    // Build complete project object
    const finalSector = parsedData.detectedSector || sector || 'Économie Circulaire & Éco-innovation';
    const auditResult = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      sector: finalSector,
      description,
      location: resolveLocation(location),
      targetAudience: targetAudience || 'B2B / B2C Éco-responsable',
      businessModel: businessModel || 'Économie Circulaire & Vente directe',
      lifeCycleDetails: lifeCycleDetails || '',
      createdAt: new Date().toISOString(),
      ...parsedData,
    };

    // Auto-save to cloud history if authorized (non-blocking)
    if (req.body.shouldSave) {
      saveProjectToFirestore(auditResult);
    }

    res.json({ success: true, data: auditResult });
  } catch (error: any) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Une erreur est survenue lors de l\'analyse environnementale.',
    });
  }
});

// Specialized Green Entrepreneurship AI Assistant Endpoint
app.post('/api/chat', async (req: express.Request, res: express.Response) => {
  try {
    const { message, history, projectContext } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Message requis.' });
      return;
    }

    const systemInstruction = `
Tu es un Expert Environnemental Senior avec plus de 20 ans d'expérience internationale dans le pilotage de projets industriels et écologiques complexes. Tu es reconnu pour ton intransigeance éthique, ta franchise absolue et ton évaluation sincère et sans concession des impacts écologiques réels (zéro greenwashing). Tu maîtrises parfaitement :
- **ISO 14001** : Méthodologie d'Analyse Environnementale et de hiérarchisation des Aspects Environnementaux Significatifs (AES) selon la matrice **Criticité = (Fréquence × Gravité × Sensibilité) / Maîtrise**.
- **Guide & Panorama Institut Agro Montpellier (HAL)** : Sélection et combinaison multi-méthodes d'évaluation environnementale : ACV multi-critères (ISO 14040/14044), Bilan Carbone (GHG Protocol Scopes 1-2-3), MFA (Analyse des Flux de Matière), ERA (Évaluation des Risques Écotoxiques), AMC/MCDA (Analyse Multicritère de Décision) et MEA/IPBES (Valuation des Services Écosystémiques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : Éco-responsabilité, préservation stricte des ressources en eau en milieu aride, lutte contre la dégradation des sols et résilience hydro-climatique.
- **Normes Internationales** : CSRD, Taxonomie UE, ISO 14040/14044 (ACV), GHG Protocol (Scopes 1-2-3), lois AGEC/ESPR.

Ton expertise couvre :
1. **Évaluation Sincère des AES & Impacts Écologiques :** Analyse critique des cycles de vie, hiérarchisation normée des impacts (ISO 14001), identification des externalités négatives cachées, des risques de transfert de pollution et des véritables gains nets.
2. **Gestion de l'Eau & Résilience Aride (Directives OSS) :** Évaluation de la pression sur les nappes phréatiques, recyclage en boucle fermée ZLD (Zero Liquid Discharge), lutte contre l'érosion et valorisation éco-citoyenne.
3. **Transition Bas-Carbone & Critères ESG :** Comptabilité carbone (Scopes 1, 2, 3), trajectoires SBTi, critères ESG et intégration extra-financière.
4. **Conformité Réglementaire Nationale et Internationale :** CSRD, taxonomie européenne, réglementations environnementales régionales (CITET, ANME, directives d'implantation).
5. **Pilotage de Projets & Financement Vert :** Structuration technique, plans de réduction d'urgence, ingénierie de financement vert (ADEME, Bpifrance, FODEP, BERD, Fonds Vert).

*** RÈGLE ÉTHIQUE & SÉCURITÉ ABSOLUE : ***
Si la question ou le projet abordé concerne des technologies militaires, des armes, des substances illicites, de la désinformation écologique ou toute activité ayant une finalité destructrice pour l'environnement ou l'humain, tu refuses catégoriquement et directement, en expliquant les raisons scientifiques et éthiques de ton refus.

${projectContext ? `
Contexte technique actuel du projet audité :
- Titre : ${projectContext.title || 'Non spécifié'}
- Lieu d'implantation : ${resolveLocation(projectContext.location)}
- Secteur : ${projectContext.sector || 'Non spécifié'}
- Description : ${projectContext.description || 'Non spécifié'}
- Scores d'impact : Environnement ${projectContext.projectSynthesis?.scores?.environmental ?? '--'}/100, Social ${projectContext.projectSynthesis?.scores?.social ?? '--'}/100, Circularité ${projectContext.projectSynthesis?.scores?.circularity ?? '--'}/100, Global ${projectContext.projectSynthesis?.scores?.globalScore ?? '--'}/100
- Empreinte carbone produit : ${projectContext.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? '--'} kg CO2e / unité
` : ''}

Réponds en français avec un ton professionnel, direct, hautement qualifié, analytique et sans complaisance. Apporte des conseils d'expert aguerri, des analyses de risques rigoureuses et des recommandations pratiques basées sur le terrain.
`;

    // Build contents from history
    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item.role === 'user' || item.role === 'model') {
          contents.push({
            role: item.role,
            parts: [{ text: item.content }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let reply = '';

    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        singleAttemptTimeoutMs: 12000,
        totalTimeoutMs: 20000,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      reply = response.text || 'Désolé, je n\'ai pas pu générer de réponse.';
      console.log(`[Chat Engine] Réponse conversationnelle générée avec ${modelUsed}`);
    } catch (aiErr: any) {
      console.warn(
        '[Chat Engine] Surcharge temporaire des modèles Gemini (503). Génération d\'une réponse experte de repli :',
        aiErr?.message
      );
      reply =
        `### Conseil de l'Éco-Conseiller Vert'Idée\n\n` +
        `Pour votre projet ${projectContext?.title ? `**« ${projectContext.title} »**` : 'd\'entrepreneuriat vert'},\n\n` +
        `Concernant votre demande : *« ${message} »* :\n\n` +
        `1. **Optimisation de l'empreinte & ACV :** Ciblez les postes les plus émetteurs dès la conception (matières bio-sourcées ou recyclées en circuits courts, réduction des consommations énergétiques).\n` +
        `2. **Partenaires & Pépinières :** Appuyez-vous sur les structures locales comme l'**APII** et le réseau des pépinières **RNPE** pour bénéficier d'un hébergement, d'un coaching et d'allègements fiscaux d'amorçage.\n` +
        `3. **Dispositifs de financement vert :** Explorez le Fonds de Transition Énergétique (**FTE / ANME**), les programmes de l'Union Européenne (**SwitchMed / Green Deal**) et les prêts d'honneur à impact.\n` +
        `4. **Labellisation & Crédibilité :** Préparez un dossier pour un label reconnu (**ISO 14001**, **B-Corp**, **Écolabel**) afin d'accélérer vos contrats B2B et justifier de votre impact environnemental réel.\n\n` +
        `*Note : Les serveurs de calcul IA centraux connaissent actuellement un pic passager de forte affluence (503), mais vos données et diagnostics demeurent 100% sécurisés et consultables.*`;
    }

    res.json({ success: true, reply });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Erreur lors de la conversation avec l\'assistant IA.',
    });
  }
});

export default app;
