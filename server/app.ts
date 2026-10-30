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
import firebaseConfig from '../firebase-applet-config.json';

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

// Valid model names per Gemini API SDK guidelines - prioritizes models with active quota
const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
// Model cooldown tracking to remember quota (429) exhaustion and prevent repeated failures
const modelCooldowns = new Map<string, number>();
// Pre-register gemini-3.8-flash cooldown based on free-tier limit reset
modelCooldowns.set('gemini-3.8-flash', Date.now() + 9 * 3600 * 1000);

let discoveredGeminiModels: string[] = [];
let geminiModelsExpiresAt = 0;

async function getAvailableGeminiModels(): Promise<string[]> {
  if (Date.now() < geminiModelsExpiresAt && discoveredGeminiModels.length) return discoveredGeminiModels;
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY non configurée.');
  const available: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, {
      headers: { 'x-goog-api-key': key },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      throw new Error(`Impossible de consulter les modèles Gemini (HTTP ${response.status}) : ${details}`);
    }
    const data: any = await response.json();
    for (const model of data.models || []) {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        available.push(String(model.name).replace(/^models\//, ''));
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  if (!available.length) throw new Error('Aucun modèle compatible generateContent accessible à cette clé API.');
  discoveredGeminiModels = available;
  geminiModelsExpiresAt = Date.now() + 10 * 60 * 1000;
  return available;
}

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
    let providerModels = models;
    if (provider === 'gemini') {
      try {
        const available = await promiseWithTimeout(getAvailableGeminiModels(), 10000, 'Délai de découverte Gemini dépassé');
        const preferred = models.filter((name) => available.includes(name));
        providerModels = preferred.length ? preferred : available.filter((name) => /flash/i.test(name));
        if (!providerModels.length) providerModels = available;
        // Filtrer les modèles temporairement en pause suite à un dépassement de quota (429)
        const activeModels = providerModels.filter((name) => (modelCooldowns.get(name) || 0) <= Date.now());
        providerModels = activeModels.length > 0 ? activeModels : providerModels;
        providerModels = providerModels.slice(0, 3);
      } catch (err: any) {
        lastError = err;
        console.info('[AI Engine] Découverte des modèles différée, utilisation des modèles configurés.');
        const activeModels = DEFAULT_MODELS.filter((name) => (modelCooldowns.get(name) || 0) <= Date.now());
        providerModels = activeModels.length > 0 ? activeModels : DEFAULT_MODELS;
      }
    }
    for (const modelName of providerModels) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalTimeout) break;

      // Sauter le modèle s'il est en période de cooldown pour quota atteint
      const cooldownUntil = modelCooldowns.get(modelName) || 0;
      if (Date.now() < cooldownUntil) {
        const remainingMin = Math.ceil((cooldownUntil - Date.now()) / 60000);
        console.info(`[AI Engine] Modèle "${modelName}" en pause de quota (${remainingMin} min). Passage au modèle suivant.`);
        continue;
      }

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

        const isQuota = /quota|429|exhausted|resource_exhausted/i.test(errMsg);
        const isAuth = /API key|API_KEY|PERMISSION_DENIED|401|403|credit card|customer_verification/i.test(errMsg);

        if (isQuota) {
          let cooldownMs = 60 * 60 * 1000; // 1h par défaut
          const matchSeconds = errMsg.match(/retryDelay"?\s*:\s*"?(\d+)s?/i);
          if (matchSeconds) {
            cooldownMs = (parseInt(matchSeconds[1], 10) + 15) * 1000;
          } else {
            const matchHours = errMsg.match(/retry in (\d+)h/i);
            if (matchHours) {
              cooldownMs = (parseInt(matchHours[1], 10) * 3600 + 300) * 1000;
            }
          }
          modelCooldowns.set(modelName, Date.now() + cooldownMs);
          console.info(`[AI Engine] Quota journalier atteint pour "${label}" (429). Pause de ${Math.round(cooldownMs / 60000)} min. Basculement immédiat vers le modèle suivant.`);
          continue;
        }

        if (isAuth) {
          console.info(`[AI Engine] Clé API ou permissions insuffisantes pour "${label}".`);
          if (provider === 'gemini') geminiQuotaExhaustedUntil = Date.now() + 10 * 60 * 1000;
          else gatewayUnavailableUntil = Date.now() + 10 * 60 * 1000;
          break;
        }

        console.info(`[AI Engine] ${provider} "${label}" non disponible (${errMsg.slice(0, 80)}). Essai du modèle suivant...`);
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

/**
 * Analyse sémantique locale de secours garantissant des phrases complètes,
 * explicites et rigoureusement articulées sans coupure en milieu d'idée.
 */
function extractRichDescriptionFallback(rawText: string, filename: string): {
  richDescription: string;
  suggestedTitle: string;
  suggestedLocation: string;
} {
  // Normalisation du texte : suppression des césures de mots et fusion des lignes d'un même paragraphe
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/(\w+)-\n(\w+)/g, '$1$2')
    .replace(/\n(?!\n)/g, ' ')
    .replace(/[ \t]+/g, ' ');

  // Découpage strict sur les frontières de phrases réelles (. ! ?)
  const rawSentences = normalizedText.split(/(?<=[.!?])\s+/);
  const cleanSentences = rawSentences
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 20) return false;
      // Élimination des numéros de page, mentions légales ou titres de sommaire isolés
      if (/^(page\s+\d+|p\.\s*\d+|[-=_*]{3,}|\d+\s*\/\s*\d+|copyright|tous droits réservés|confidentialité)/i.test(s)) {
        return false;
      }
      return true;
    });

  // Détection du lieu (villes et gouvernorats tunisiens prioritaires + international)
  const locationRegex = /\b(Tunisie|Tunis|Sfax|Sousse|Bizerte|Nabeul|Monastir|Kairouan|Gabès|Médenine|Gafsa|Jendouba|Béja|Kasserine|Sidi Bouzid|Mahdia|Siliana|Zaghouan|Tozeur|Kébili|Tataouine|France|Paris|Lyon|Marseille|Bretagne)\b/i;
  let suggestedLocation = '';
  const locMatch = rawText.match(locationRegex);
  if (locMatch) {
    suggestedLocation = locMatch[1];
    if (
      locMatch[1].toLowerCase() !== 'tunisie' &&
      /tunis|sfax|sousse|bizerte|nabeul|monastir|kairouan|gabès|médenine|gafsa|kasserine|jendouba|béja|sidi bouzid|mahdia/i.test(locMatch[1])
    ) {
      suggestedLocation = `${suggestedLocation}, Tunisie`;
    }
  }

  // Détection d'un titre explicite
  let suggestedTitle = '';
  for (const s of cleanSentences) {
    const clean = s.replace(/^(projet|titre|rapport|sujet|intitulé|nom du projet)\s*[:\-]\s*/i, '').trim();
    if (clean.length >= 5 && clean.length <= 90 && !/sommaire|table des matières|introduction|abstract|résumé/i.test(clean)) {
      suggestedTitle = clean.replace(/[.:;]$/, '');
      break;
    }
  }
  if (!suggestedTitle) {
    suggestedTitle = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  }

  // Regroupement sémantique par phrases complètes
  const visionSentences: string[] = [];
  const techSentences: string[] = [];
  const valueSentences: string[] = [];
  const generalSentences: string[] = [];

  for (const s of cleanSentences) {
    const lower = s.toLowerCase();
    if (/problématique|contexte|défi|besoin|enjeu|pollution|déchet|gaspillage|objectif|développe|conçoit|consiste à|solution visant|mission/.test(lower)) {
      visionSentences.push(s);
    } else if (/technique|procédé|fonctionnement|technologie|brevet|matière|intrant|composant|matériau|ressource|fabrication|machine|scooter|camionnette|application|flotte/.test(lower)) {
      techSentences.push(s);
    } else if (/valeur|avantage|bénéfice|client|partenaire|marché|économique|tarif|prix|abonnement|dt|coût|durabilit|rentabilit|modèle/.test(lower)) {
      valueSentences.push(s);
    } else {
      generalSentences.push(s);
    }
  }

  // Assemblage de paragraphes rédigés avec des phrases complètes
  const p1 = [...visionSentences, ...generalSentences.slice(0, 1)].slice(0, 3).join(' ');
  const p2 = [...techSentences, ...generalSentences.slice(1, 2)].slice(0, 3).join(' ');
  const p3 = [...valueSentences, ...generalSentences.slice(2, 3)].slice(0, 3).join(' ');

  const sections: string[] = [];
  if (p1) {
    sections.push(`■ 1. Vue d'ensemble du projet & Problématique adressée : concept clé, secteur d'activité, dysfonctionnement ou pollution résolu.\n${p1}`);
  }
  if (p2) {
    sections.push(`■ 2. Solution technique, intrants & Procédés sobres : fonctionnement concret, matières biosourcées/recyclées, sobriété énergétique et hydrique, chimie verte.\n${p2}`);
  }
  if (p3) {
    sections.push(`■ 3. Proposition de valeur & Modèle circulaire : gains économiques et opérationnels pour les clients, éco-conception, réemploi, réparabilité, symbiose industrielle.\n${p3}`);
  }

  let richDescription = sections.join('\n\n');
  if (richDescription.length < 100) {
    richDescription = cleanSentences.slice(0, 6).join(' ');
  }

  return {
    richDescription,
    suggestedTitle,
    suggestedLocation,
  };
}

/**
/**
 * Extrait le texte brut depuis un fichier (PDF, DOCX, XLSX, TXT, Images)
 */
async function extractRawTextFromFile(buffer: Buffer, filename: string, mimeType?: string, base64Data?: string): Promise<string> {
  const ext = path.extname(filename || '').toLowerCase();
  let extractedText = '';

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    // 1. Première tentative : unpdf (moteur moderne sans worker externe)
    try {
      const { extractText } = await import('unpdf');
      const pdfResult = await extractText(new Uint8Array(buffer));
      if (pdfResult && pdfResult.text) {
        extractedText = Array.isArray(pdfResult.text)
          ? pdfResult.text.join('\n\n')
          : String(pdfResult.text);
      }
    } catch (unpdfErr: any) {
      console.warn('[File Extract] unpdf non disponible:', unpdfErr?.message);
    }

    // 2. Deuxième tentative : pdf-parse v2
    if (!extractedText || extractedText.trim().length < 20) {
      try {
        const PDFParse = await loadPDFParse();
        if (PDFParse) {
          const parser = typeof PDFParse === 'function' ? new PDFParse({ data: buffer }) : null;
          if (parser && typeof parser.getText === 'function') {
            const parsedResult = await parser.getText();
            extractedText = typeof parsedResult === 'string' ? parsedResult : (parsedResult?.text || '');
          }
        }
      } catch (pdfErr: any) {
        console.warn('[File Extract] Erreur pdf-parse:', pdfErr?.message);
      }
    }

    // 3. Troisième tentative : Gemini Multimodal pour PDF scannés ou à rendu graphique
    if ((!extractedText || extractedText.trim().length < 25) && base64Data) {
      try {
        const { response: aiRes } = await generateContentWithResilience({
          singleAttemptTimeoutMs: 18000,
          totalTimeoutMs: 25000,
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: 'Extrais et transcris fidèlement tout le texte, la description du projet, les chiffres, le modèle économique et les détails techniques de ce document PDF, sans interprétation.',
            },
          ],
        });
        if (aiRes && aiRes.text && aiRes.text.trim().length > 10) {
          extractedText = aiRes.text;
        }
      } catch (geminiPdfErr: any) {
        console.info('[File Extract] Extraction PDF locale appliquée.');
      }
    }
  } else if (ext === '.docx' || ext === '.doc' || mimeType?.includes('word')) {
    try {
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedText = mammothResult.value || '';
    } catch (wordErr: any) {
      console.info('[File Extract] Extraction Word (mammoth) ignorée.');
    }

    if ((!extractedText || extractedText.trim().length < 20) && base64Data) {
      try {
        const wordMime = ext === '.docx' || mimeType?.includes('openxmlformats')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/msword';
        const { response: aiRes } = await generateContentWithResilience({
          singleAttemptTimeoutMs: 18000,
          totalTimeoutMs: 25000,
          contents: [
            {
              inlineData: {
                mimeType: wordMime,
                data: base64Data,
              },
            },
            {
              text: 'Extrais et transcris fidèlement tout le texte et la description du projet figurant dans ce document Word.',
            },
          ],
        });
        if (aiRes && aiRes.text && aiRes.text.trim().length > 10) {
          extractedText = aiRes.text;
        }
      } catch (geminiWordErr: any) {
        console.info('[File Extract] Extraction Word locale appliquée.');
      }
    }

    if (!extractedText || extractedText.trim().length < 20) {
      extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00A0-\u024F\n\r\t]/g, ' ');
    }
  } else if (ext === '.xlsx' || ext === '.xls' || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      extractedText = workbook.SheetNames
        .map((sheetName) => {
          const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { FS: '\t', RS: '\n' });
          return `--- Feuille: ${sheetName} ---\n${csv}`;
        })
        .join('\n\n');
    } catch (xlsxErr: any) {
      console.info('[File Extract] Extraction XLSX brute appliquée.');
    }

    if ((!extractedText || extractedText.trim().length < 20) && base64Data) {
      try {
        const excelMime = ext === '.xlsx' || mimeType?.includes('openxmlformats')
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.ms-excel';
        const { response: aiRes } = await generateContentWithResilience({
          singleAttemptTimeoutMs: 18000,
          totalTimeoutMs: 25000,
          contents: [
            {
              inlineData: {
                mimeType: excelMime,
                data: base64Data,
              },
            },
            {
              text: 'Extrais et transcris fidèlement toutes les données, tableaux et explications de ce fichier Excel.',
            },
          ],
        });
        if (aiRes && aiRes.text && aiRes.text.trim().length > 10) {
          extractedText = aiRes.text;
        }
      } catch (geminiExcelErr: any) {
        console.info('[File Extract] Extraction Excel locale appliquée.');
      }
    }
  } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || mimeType?.startsWith('image/')) {
    if (base64Data) {
      try {
        const cleanMime = mimeType && mimeType.startsWith('image/') ? mimeType : (ext === '.png' ? 'image/png' : 'image/jpeg');
        const { response: aiRes } = await generateContentWithResilience({
          singleAttemptTimeoutMs: 18000,
          totalTimeoutMs: 25000,
          contents: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text: 'Extrais et transcris fidèlement tout le texte, les données, le titre, la problématique et la description du projet figurant sur cette image, sans interprétation.',
            },
          ],
        });
        if (aiRes && aiRes.text) {
          extractedText = aiRes.text;
        }
      } catch (imgErr: any) {
        console.info('[File Extract] OCR Image non disponible, données textuelles conservées.');
      }
    }
  } else {
    try {
      extractedText = buffer.toString('utf-8');
    } catch {
      extractedText = buffer.toString('latin1');
    }
  }

  return (extractedText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Endpoint d'extraction et de synthèse selon les 3 piliers méthodologiques
app.post('/api/extract-file', async (req: express.Request, res: express.Response) => {
  try {
    const rawFiles = Array.isArray(req.body.files) && req.body.files.length > 0
      ? req.body.files
      : req.body.base64Data
      ? [{ filename: req.body.filename, base64Data: req.body.base64Data, mimeType: req.body.mimeType, localText: req.body.localText }]
      : [];

    if (rawFiles.length === 0) {
      res.status(400).json({ success: false, error: 'Données de fichier manquantes.' });
      return;
    }

    const extractedFiles: Array<{ filename: string; text: string }> = [];

    for (const item of rawFiles) {
      if (!item.base64Data && !item.localText) continue;
      const buffer = item.base64Data ? Buffer.from(item.base64Data, 'base64') : Buffer.from(item.localText || '');
      let text = await extractRawTextFromFile(buffer, item.filename, item.mimeType, item.base64Data);

      if ((!text || text.trim().length === 0) && item.localText && item.localText.trim().length > 0) {
        text = item.localText.trim();
      }

      if (!text || text.trim().length === 0) {
        const cleanName = (item.filename || 'Document').replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        text = `Projet issu du document : ${cleanName}.\nDescription : Document joint concernant le fonctionnement, les intrants et les objectifs écologiques du projet.`;
      }

      extractedFiles.push({ filename: item.filename || 'Document', text: text.trim() });
    }

    if (extractedFiles.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Impossible d\'extraire du texte de ce(s) document(s). Assurez-vous qu\'ils ne sont pas protégés par un mot de passe.',
      });
      return;
    }

    // Agrégation textuelle propre de tous les documents importés
    const fileLabels = extractedFiles.map((f) => f.filename).join(', ');
    const combinedSourceText = extractedFiles.length === 1
      ? extractedFiles[0].text
      : extractedFiles
          .map((f, i) => `=== DOCUMENT ${i + 1} SUR ${extractedFiles.length} : ${f.filename} ===\n${f.text}`)
          .join('\n\n');

    // Analyse locale heuristique de référence (secours immédiat garanti)
    const fallbackData = extractRichDescriptionFallback(combinedSourceText, extractedFiles[0].filename);
    let finalDescription = fallbackData.richDescription;
    let suggestedTitle = fallbackData.suggestedTitle;
    let suggestedLocation = fallbackData.suggestedLocation;
    let isAIEnhanced = false;

    // Préparation pour l'IA (jusqu'à 35 000 caractères)
    let preparedSource = combinedSourceText;
    if (combinedSourceText.length > 35000) {
      const head = combinedSourceText.slice(0, 16000);
      const midStart = Math.floor(combinedSourceText.length * 0.4);
      const middle = combinedSourceText.slice(midStart, midStart + 12000);
      const tail = combinedSourceText.slice(-7000);
      preparedSource = `[Synthèse amont & Contexte] :\n${head}\n\n[Procédés & Données techniques] :\n${middle}\n\n[Résultats & Conclusions] :\n${tail}`;
    }

    if (combinedSourceText.length > 50) {
      try {
        // --- PREMIÈRE PASSE : Extraction brute et factuelle en éliminant tout bruit structurel ---
        const pass1Prompt = `Tu es un assistant de retranscription factuelle. Ton rôle est de lire les documents importés (${fileLabels}) et d'extraire uniquement le contenu rédactionnel et informatif utile du projet.

CONSIGNES STRICTES DE FILTRAGE :
1. EXCLUSION TOTALE DES SOMMAIRES ET TABLES DES MATIÈRES : Ignore et jette toutes les lignes de tables des matières, listes de chapitres, index, titres de rubriques isolés (ex: "Table des matières", "6 Besoins prioritaires...", "4 Proposition de valeur...", "1 / 15", "Plan d'affaires Confidentiel").
2. EXCLUSION DES EN-TÊTES ET PIEDS DE PAGE : Ignore les en-têtes de pages, numéros de page (ex: "2 / 15", "3 / 15"), mentions de copyright et métadonnées de document.
3. CONSERVATION UNIQUEMENT DU CORPS DU TEXTE : Extrais uniquement les phrases explicatives du fond du projet (problématique, description de la solution, fonctionnalités, public cible, modèle économique, intrants).

TEXTE BRUT DES DOCUMENTS À FILTRER :
${preparedSource}`;

        const { response: pass1Res } = await generateContentWithResilience({
          contents: pass1Prompt,
          config: {
            temperature: 0.0,
          },
          singleAttemptTimeoutMs: 15000,
          totalTimeoutMs: 22000,
        });

        const rawExtractedFacts = pass1Res?.text || combinedSourceText;

        // --- DEUXIÈME PASSE : Relecture, polissage et structuration rigoureuse en 3 piliers ---
        const pass2Prompt = `Tu es un éditeur et relecteur expert en projets industriels et écologiques. À partir des éléments factuels extraits des documents, rédige une description claire, fluide, parfaitement articulée et formalisée strictement selon les 3 rubriques ci-dessous.

CONSIGNES STRICTES POUR LA SECONDE LECTURE :
1. RESPECT ABSOLUE DES 3 RUBRIQUES (les libellés exacts doivent être conservés) :
   - ■ 1. Vue d'ensemble du projet & Problématique adressée
   - ■ 2. Solution technique, intrants & Procédés sobres
   - ■ 3. Proposition de valeur & Modèle circulaire
2. QUALITÉ RÉDACTIONNELLE (ZÉRO PHRASE INCOMPLÈTE) : Rédige chaque section avec des phrases complètes (Sujet, Verbe, Complément), bien ponctuées et soignées. Élimine toute phrase coupée, tout style télégraphique et toute approximation.
3. FIDÉLITÉ FACTUELLE TOTALE : Interdiction totale d'inventer des allégations écologiques, des chiffres ou des labels non présents dans les données sources. Restitue fidèlement la réalité exacte du projet.

ÉLÉMENTS FACTUELS À STRUCTURER :
${rawExtractedFacts}

FORMAT DE RÉPONSE STRICT (JSON valide) :
{
  "suggestedTitle": "Titre clair et explicite du projet",
  "suggestedLocation": "Lieu ou région explicitement mentionné dans le document (ou chaîne vide si non précisé)",
  "richDescription": "Texte complet structuré avec les 3 rubriques exactes..."
}`;

        const { response: pass2Res } = await generateContentWithResilience({
          contents: pass2Prompt,
          config: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
          singleAttemptTimeoutMs: 18000,
          totalTimeoutMs: 25000,
        });

        if (pass2Res && pass2Res.text) {
          try {
            const parsed = JSON.parse(pass2Res.text);
            if (parsed.richDescription && parsed.richDescription.trim().length > 60) {
              finalDescription = parsed.richDescription.trim();
              isAIEnhanced = true;
            }
            if (parsed.suggestedTitle && parsed.suggestedTitle.trim()) {
              suggestedTitle = parsed.suggestedTitle.trim();
            }
            if (parsed.suggestedLocation && parsed.suggestedLocation.trim()) {
              suggestedLocation = parsed.suggestedLocation.trim();
            }
          } catch (jsonErr) {
            const cleanText = pass2Res.text.replace(/^```json\s*|\s*```$/g, '').trim();
            try {
              const retryParsed = JSON.parse(cleanText);
              if (retryParsed.richDescription) {
                finalDescription = retryParsed.richDescription.trim();
                isAIEnhanced = true;
              }
              if (retryParsed.suggestedTitle) suggestedTitle = retryParsed.suggestedTitle.trim();
              if (retryParsed.suggestedLocation) suggestedLocation = retryParsed.suggestedLocation.trim();
            } catch {
              if (cleanText.length > 80) {
                finalDescription = cleanText;
                isAIEnhanced = true;
              }
            }
          }
        }
      } catch (sumErr: any) {
        console.info('[File Extract] Synthèse sémantique locale appliquée.');
      }
    }

    // Mise en forme claire et aérée avec double saut de ligne entre les 3 piliers
    finalDescription = finalDescription
      .replace(/\s*(■\s*[123]\.)/g, '\n\n$1')
      .replace(/^\n+/, '')
      .trim();

    res.json({
      success: true,
      filename: fileLabels,
      extractedText: finalDescription,
      rawFullText: combinedSourceText,
      suggestedTitle,
      suggestedLocation,
      isAIEnhanced,
      processedFilesCount: extractedFiles.length,
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

function normalizeDescriptionKey(desc: string, loc: string, answers?: any, fullDoc?: string): string {
  const cleanDesc = (desc || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const cleanLoc = (loc || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const cleanAnswers = answers ? JSON.stringify(answers) : '';
  const cleanFullDoc = fullDoc ? fullDoc.toLowerCase().trim().slice(0, 500) : '';
  return `${cleanDesc}:::${cleanLoc}:::${cleanAnswers}:::${cleanFullDoc}`;
}

// Expert Ecological Analysis API with EXACTLY the 8 required sections
app.post('/api/analyze', async (req: express.Request, res: express.Response) => {
  try {
    const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails, fullDocumentContent } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, error: 'Le titre et la description du projet sont obligatoires.' });
      return;
    }

    // Vérification du cache de cohérence déterministe
    // Si la même description opérationnelle et les mêmes documents ont déjà été évalués,
    // nous garantissons des scores strictement identiques et une parfaite cohérence sans dérive stochastique
    const cacheKey = normalizeDescriptionKey(description, resolveLocation(location), req.body && req.body.answers, fullDocumentContent);
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
- **Cadre des 17 ODD et 169 cibles de l'Agenda 2030 (ONU / Pacte Mondial - Réseau France)** : Évaluation rigoureuse et multi-acteurs de la contribution des projets aux Objectifs de Développement Durable, en s'appuyant sur les sous-cibles spécifiques et les indicateurs d'impact normés.

*** OBLIGATION D'ANALYSE DÉTAILLÉE DU CONTENU DES DOCUMENTS IMPORTÉS ***
Si la requête contient la rubrique 'CONTENU INTÉGRAL ET EXHAUSTIF DES DOCUMENTS IMPORTÉS (PDF, Word, Excel, Images JPG/PNG)', le Collège des 4 Experts DOIT impérativement fonder son audit (scores d'impacts, ACV, bilan carbone, ODD, risques) sur l'ENSEMBLE des données chiffrées, techniques, logistiques et financières contenues dans ce texte intégral, et non pas uniquement sur la description synthétique. L'analyse doit tirer pleinement parti de toutes les précisions opérationnelles fournies dans ces documents joints.

*** RÈGLE DE STABILITÉ ET DÉTERMINISME DU SCORING (OBLIGATION SCIENTIFIQUE ABSOLUE) ***
1. INDÉPENDANCE TOTALE VIS-À-VIS DU NOM / MARQUE : L'évaluation environnementale et les scores (environnemental, social, circularité, maturité carbone et score global) reposent EXCLUSIVEMENT et STRICTEMENT sur la nature des activités réelles, les intrants, les procédés de fabrication ou de service, les flux de matière et d'énergie, et les externalités décrits dans la DESCRIPTION et les DOCUMENTS IMPORTÉS.
2. Le titre commercial ou nom de marque (ex: "grandii", "t3allem", ou tout autre libellé) n'est qu'un identifiant arbitraire. Il NE DOIT EN AUCUN CAS faire varier les scores ni l'analyse d'impact.
3. Si deux projets présentent la même description opérationnelle et les mêmes caractéristiques, le Collège d'Experts DOIT impérativement attribuer des scores strictement identiques et reproductibles. Toute divergence de notation due au nom du projet est une erreur méthodologique inacceptable.

1. ANALYSE PRÉLIMINAIRE : Vérifie si les informations fournies (titre, description, lieu, documents joints) sont suffisantes pour réaliser un audit environnemental complet ET crédible.
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
1. Synthèse du projet : Scores d'impacts rigoureusement calibrés (sévères si polluant), avis collégial des experts (STRICTEMENT LIMITÉ À 5 LIGNES MAX / ~40-50 mots directement après le nom du projet) et vision de transformation.
2. Aspects & impacts environnementaux : Analyse approfondie des aspects et impacts environnementaux (directs et indirects, positifs et négatifs) sur les écosystèmes, l'air, l'eau, le climat, les sols et la biodiversité. Évaluation normée des AES selon la matrice ISO 14001 (F, G, S, M), quantification des impacts par phase du cycle de vie (ACV ISO 14040/14044), écotoxicité (ERA), flux de matière (MFA) et leviers d'atténuation d'impacts.
3. Aspects & impacts sociaux et sociétaux : Analyse approfondie des impacts sociaux et sociétaux directs et indirects : santé et sécurité des travailleurs, santé publique et riverains (exposition poussières PM, produits toxiques, bruit), création d'emplois locaux pérennes, retombées communautaires, gouvernance partagée éthique (ISO 26000) et accompagnement vers une transition juste.
4. Intégration de l'entrepreneuriat vert : Analyse économique critique, modèles de rupture technologique nécessaires (ex: recyclage d'eau fermé ZLD, filtres-presses, solaire dédié).
5. Alignement ODD (Objectifs de Développement Durable - Méthodologie normée SDG Compass, ONU Agenda 2030, GRI & CSRD/ESRS) :
   - RÈGLE DE MATÉRIALITÉ & NIVEAU DE CONTRIBUTION : Distinguer rigoureusement les contributions 'Majeur' (cœur de métier / impact direct mesurable) des contributions 'Secondaire' (impact indirect / mesures transversales). Éviter le saupoudrage non justifié (tolérance zéro au SDG-washing).
   - CODES OFFICIELS ET INDICATEURS DE L'ONU : Pour chaque ODD retenu, renseigner impérativement les sous-cibles officielles (ex: 12.5, 13.2, 4.4, 6.4), les libellés de l'Agenda 2030, ainsi que l'indicateur officiel ONU associé (ex: 'Indicateur ONU 12.5.1 (Taux de valorisation matière)').
   - PRINCIPE DNSH (Do No Significant Harm / Non-nuisance importante) : Fournir pour chaque ODD une analyse DNSH garantissant que l'atteinte de cette cible ne cause aucun dommage disproportionné sur les autres écosystèmes (ex: consommation énergétique d'un service digital, recyclage batterie solaire, etc.).
   - KPI DE SUIVI ET STANDARDS GRI / CSRD : Spécifier au moins 1 KPI d'impact chiffrable et les liens normatifs pertinents (ex: GRI 302, GRI 303, GRI 305, GRI 306, ESRS E1, ESRS E5, ESRS S1).
   - RÈGLE IMPÉRATIVE POUR LES PROJETS EDTECH / ÉDUCATION : Pour tout projet relevant de l'éducation, de la formation, de l'EdTech, de l'inclusion (ex: enfants TSA, DYS) ou de la pédagogie, tu DOIS obligatoirement inclure l'**ODD 4 (Éducation de qualité)** en premier et au niveau 'Majeur' (avec les sous-cibles 4.1, 4.4, 4.5 et 4.7), complété par les ODD 10, 8 et 12.
6. Indicateurs d'impact : Bilan carbone normé selon ISO 14067:2018 (par unité fonctionnelle) et ISO 14064-1:2018 (Catégories 1 à 6). Analyse de cycle de vie étape par étape (Approvisionnement Cat 4, Fabrication Cat 1-2, Conditionnement Cat 4, Transport Cat 3, Utilisation Cat 5, Fin de vie Cat 5) avec exclusion stricte de toute compensation carbone fictive. Pour benchmarkComparison : si le projet appartient à une industrie lourde ou polluante, totalCarbonKgCO2e DOIT être STRICTEMENT SUPÉRIEUR à industryAverageKgCO2e (+20% à +60% de sur-émissions) ; si éco-innovation vertueuse, totalCarbonKgCO2e DOIT être INFÉRIEUR (-20% à -65%). Actions de décarbonation quantifiées (P1/P2/P3), intensité eau chiffrée.
7. Financements et labels verts : Statut d'éligibilité réel (exclusion formelle des labels verts si activité polluante), fonds de mise en conformité et dépollution (FODEP, BERD Climat).
8. Plan d'action prioritaire : Actions concrètes d'urgence (0-12 mois) priorisées avec livrables opérationnels pour la neutralisation des AES.
`;

    const userPrompt = `
Voici le projet à auditer selon les 8 sections officielles par le Collège des 4 Experts Environnementaux :
- Nom commercial / Marque du projet (Libellé administratif uniquement, NE DOIT PAS INFLUENCER LES SCORES) : ${title}
- Description synthétique de l'activité & Proposition de valeur : ${description}
- Lieu d'implantation : ${resolveLocation(location)}
${sector ? `- Secteur suggéré : ${sector}` : ''}
${targetAudience ? `- Cible suggérée : ${targetAudience}` : ''}
${businessModel ? `- Modèle économique suggéré : ${businessModel}` : ''}
${lifeCycleDetails ? `- Détails cycle de vie : ${lifeCycleDetails}` : ''}
${
  fullDocumentContent && typeof fullDocumentContent === 'string' && fullDocumentContent.trim().length > 30
    ? `
- CONTENU INTÉGRAL ET EXHAUSTIF DES DOCUMENTS IMPORTÉS (PDF, Word, Excel, Images JPG/PNG) À PRENDRE EN COMPTE DANS L'ANALYSE DÉTAILLÉE DES 4 EXPERTS :
"""
${fullDocumentContent.trim().slice(0, 50000)}
"""
(Note aux 4 Experts : Vous devez exploiter l'ensemble des données chiffrées, techniques, financières et écologiques contenues dans ces documents importés pour réaliser un audit ultra-précis, calibrer le bilan carbone et évaluer la conformité RSE/ODD).`
    : ''
}
${req.body && req.body.answers ? `- Informations complémentaires fournies (Q&R) : ${JSON.stringify(req.body.answers)}` : ''}

Consigne stricte de cotation : Calcule les scores avec une impartialité totale, en te basant sur la description et le contenu des documents importés ci-dessus. Deux projets ayant les mêmes caractéristiques doivent impérativement recevoir des scores identiques.
`;

    let parsedData: any = null;

    try {
      const { response, modelUsed } = await generateContentWithResilience({
        contents: userPrompt,
        preferredModels: DEFAULT_MODELS,
        singleAttemptTimeoutMs: 25000,
        totalTimeoutMs: 40000,
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
                  level: { type: Type.STRING, enum: ['Majeur', 'Secondaire'], description: 'Niveau de contribution : Majeur (cœur de métier / direct) ou Secondaire (transverse)' },
                  contribution: { type: Type.STRING, description: 'Contribution concrète et opérationnelle du projet' },
                  targets: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Sous-cibles ODD succinctes' },
                  targetsDetail: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        code: { type: Type.STRING, description: 'Code de la sous-cible ONU (ex: 12.5)' },
                        title: { type: Type.STRING, description: 'Intitulé officiel de la sous-cible' },
                        indicator: { type: Type.STRING, description: 'Indicateur officiel ONU (ex: Indicateur ONU 12.5.1)' },
                        targetKpi: { type: Type.STRING, description: 'Objectif chiffré / KPI cible' },
                      },
                      required: ['code', 'title'],
                    },
                    description: 'Détail technique des sous-cibles ONU',
                  },
                  kpis: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Indicateurs clés de performance suivis' },
                  dnshAssessment: { type: Type.STRING, description: 'Analyse Do No Significant Harm (Absence de préjudice important sur les autres ODD)' },
                  griStandards: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Correspondance standards GRI' },
                  csrdEsrs: { type: Type.STRING, description: 'Norme CSRD/ESRS associée' },
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
      console.info(
        '[Audit Engine] Moteur expert déterministe activé (ISO 14001 / ISO 14064 / ODD) :'
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
        preferredModels: DEFAULT_MODELS,
        singleAttemptTimeoutMs: 15000,
        totalTimeoutMs: 25000,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      reply = response.text || 'Désolé, je n\'ai pas pu générer de réponse.';
      console.log(`[Chat Engine] Réponse conversationnelle générée avec ${modelUsed}`);
    } catch (aiErr: any) {
      console.info(
        '[Chat Engine] Réponse experte déterministe générée.'
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
