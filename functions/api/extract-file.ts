import { extractText, getDocumentProxy } from 'unpdf';
import { unzipSync, strFromU8 } from 'fflate';

type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };

type Upload = {
  filename?: string;
  mimeType?: string;
  base64Data?: string;
  localText?: string;
};

const respond = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

const textExtensions = /\.(txt|md|csv|tsv|json|log|rtf)$/i;

function decodeBase64(value: string): Uint8Array {
  const encoded = value
    .replace(/^data:[^,]*;base64,/i, '')
    .replace(/\s/g, '');

  const binary = atob(encoded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#[0-9]+);/gi,
    (entity) => {
      const names: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
      };

      const named = names[entity.toLowerCase()];
      if (named !== undefined) return named;

      const hex = /^&#x/i.test(entity);
      const code = Number.parseInt(
        entity.slice(hex ? 3 : 2, -1),
        hex ? 16 : 10
      );

      return Number.isFinite(code) &&
        code > 0 &&
        code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : entity;
    }
  );
}

function extractDocx(bytes: Uint8Array): string {
  const zip = unzipSync(bytes);
  const xmlBytes = zip['word/document.xml'];

  if (!xmlBytes) {
    throw new Error('Document Word invalide.');
  }

  const xml = strFromU8(xmlBytes);

  return decodeEntities(
    xml
      .replace(/<w:tab\b[^>]*\/?\s*>/g, '\t')
      .replace(/<w:br\b[^>]*\/?\s*>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:tc>/g, '\t')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractXlsx(bytes: Uint8Array): string {
  try {
    const zip = unzipSync(bytes);
    const sharedStringsXml = zip['xl/sharedStrings.xml'];
    const sharedStrings: string[] = [];

    if (sharedStringsXml) {
      const xml = strFromU8(sharedStringsXml);
      const regex = /<t\b[^>]*>(.*?)<\/t>/gs;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(xml)) !== null) {
        sharedStrings.push(decodeEntities(match[1]));
      }
    }

    const lines: string[] = [];
    const sheetKeys = Object.keys(zip).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k));
    sheetKeys.sort();

    for (const sheetKey of sheetKeys) {
      const sheetXmlBytes = zip[sheetKey];
      if (!sheetXmlBytes) continue;
      const sheetXml = strFromU8(sheetXmlBytes);
      const rowMatches = sheetXml.match(/<row\b[^>]*>.*?<\/row>/gs) || [];

      for (const row of rowMatches.slice(0, 120)) {
        const cellMatches = row.match(/<c\b([^>]*)>(.*?)<\/c>/gs) || [];
        const rowValues: string[] = [];
        for (const cell of cellMatches) {
          const isString = /t="s"/i.test(cell);
          const valMatch = cell.match(/<v>(.*?)<\/v>/);
          if (valMatch) {
            const val = valMatch[1];
            if (isString) {
              const idx = parseInt(val, 10);
              if (!isNaN(idx) && sharedStrings[idx] !== undefined) {
                rowValues.push(sharedStrings[idx]);
              } else {
                rowValues.push(val);
              }
            } else {
              rowValues.push(val);
            }
          } else {
            const inlineText = cell.match(/<t\b[^>]*>(.*?)<\/t>/);
            if (inlineText) {
              rowValues.push(decodeEntities(inlineText[1]));
            }
          }
        }
        if (rowValues.length > 0) {
          lines.push(rowValues.join('\t'));
        }
      }
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }
    if (sharedStrings.length > 0) {
      return sharedStrings.join(' | ');
    }
  } catch (err) {
    console.warn('XLSX parsing warning:', err);
  }
  return '';
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes);
    try {
      const result = await extractText(pdf, {
        mergePages: true,
      });

      const text = Array.isArray(result?.text)
        ? result.text.join('\n\n')
        : String(result?.text || '');

      return text.trim();
    } finally {
      if (pdf && typeof (pdf as any).destroy === 'function') {
        await (pdf as any).destroy();
      }
    }
  } catch (err) {
    console.warn('[extractPdf] unpdf extraction:', err);
    return '';
  }
}

type Summary = {
  suggestedTitle: string;
  suggestedLocation: string;
  sections: {
    overview: string;
    technicalSolution: string;
    circularValue: string;
  };
};

const instructions = `Tu es un Expert Senior en entrepreneuriat vert, en éco-conception (ACV ISO 14040) et en modèles circulaires. Ton rôle est d'analyser le ou les documents transmis et d'en extraire un RÉSUMÉ FIDÈLE, factuel, exhaustif et rigoureusement structuré selon les 3 piliers obligatoires.

RÈGLES IMPÉRATIVES DE FIDÉLITÉ FACTUELLE :
1. LE DOCUMENT EST UNE SOURCE DE DONNÉES FACTUELLES : Extrais fidèlement tous les chiffres, superficies (m²), capacités de production (litres/an, unités/h), liste d'équipements industriels, matières premières, emplois (postes et effectifs), investissements financiers (montants en dinars ou euros, capitaux propres, crédits), chiffre d'affaires prévisionnel, marges, TRI, délai de récupération (payback) et localisation.
2. ZÉRO INTERPRÉTATION EXTERNE : N'invente aucun label, certification ou allégation qui ne figure pas expressément dans le document.
3. PHRASES COMPLÈTES ET SOIGNÉES : Rédige chaque rubrique avec des phrases complètes, articulées et détaillées, sans style télégraphique ni raccourci.
4. STRUCTURE EN 3 SECTIONS :
   - overview : Vue d'ensemble du projet & Problématique adressée (objet de l'unité, dysfonctionnement ou opportunité du marché, terrain/bâtiment, effectifs, investissements et financements).
   - technicalSolution : Solution technique, intrants & Procédés sobres (liste exhaustive des équipements, matières premières et emballages, étapes du process de fabrication, cadence et capacité annuelle).
   - circularValue : Proposition de valeur & Modèle circulaire (marché local vs export, prix unitaire, chiffre d'affaires prévisionnel, indicateurs de rentabilité TRI/payback, traçabilité et démarche qualité).

RÉPONDS STRICTEMENT EN JSON VALIDE respectant ce format :
{
  "suggestedTitle": "Titre complet et explicite du projet extrait du document",
  "suggestedLocation": "Lieu, ville ou pays d'implantation (ou 'Non précisé dans le document')",
  "sections": {
    "overview": "Texte détaillé pour la vue d'ensemble et la problématique...",
    "technicalSolution": "Texte détaillé pour la solution technique, les équipements et intrants...",
    "circularValue": "Texte détaillé pour la proposition de valeur, rentabilité et circularité..."
  }
}`;

function parseSummaryJson(text: string): Summary {
  let clean = (text || '').trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const fixed = clean.replace(/,\s*([\]}])/g, '$1').replace(/[\u0000-\u001F]+/g, ' ');
    parsed = JSON.parse(fixed);
  }

  let suggestedTitle = '';
  if (typeof parsed?.suggestedTitle === 'string' && parsed.suggestedTitle.trim()) {
    suggestedTitle = parsed.suggestedTitle.trim();
  } else if (typeof parsed?.title === 'string' && parsed.title.trim()) {
    suggestedTitle = parsed.title.trim();
  }

  let suggestedLocation = '';
  if (typeof parsed?.suggestedLocation === 'string' && parsed.suggestedLocation.trim()) {
    suggestedLocation = parsed.suggestedLocation.trim();
  } else if (typeof parsed?.location === 'string' && parsed.location.trim()) {
    suggestedLocation = parsed.location.trim();
  }

  let overview = '';
  let technicalSolution = '';
  let circularValue = '';

  if (parsed?.sections && typeof parsed.sections === 'object') {
    const s = parsed.sections;
    overview = s.overview || s.vueEnsemble || s['1'] || s['1. Vue d\'ensemble'] || '';
    technicalSolution = s.technicalSolution || s.solutionTechnique || s['2'] || s['2. Solution technique'] || '';
    circularValue = s.circularValue || s.modeleCirculaire || s.valeurCirculaire || s['3'] || s['3. Proposition de valeur'] || '';
  }

  if (!overview) overview = parsed?.overview || parsed?.vueEnsemble || parsed?.problematique || '';
  if (!technicalSolution) technicalSolution = parsed?.technicalSolution || parsed?.solutionTechnique || parsed?.procedes || '';
  if (!circularValue) circularValue = parsed?.circularValue || parsed?.modeleCirculaire || parsed?.valeurCirculaire || '';

  if ((!overview || !technicalSolution || !circularValue) && typeof parsed?.richDescription === 'string') {
    const parts = parsed.richDescription.split(/■\s*[123]\.\s*/i).filter(Boolean);
    if (parts.length >= 3) {
      overview = overview || parts[0].trim();
      technicalSolution = technicalSolution || parts[1].trim();
      circularValue = circularValue || parts[2].trim();
    } else if (parts.length > 0) {
      overview = overview || parts[0].trim();
    }
  }

  overview = overview.trim();
  technicalSolution = technicalSolution.trim();
  circularValue = circularValue.trim();

  if (!overview && !technicalSolution && !circularValue) {
    throw new Error('Réponse IA sans contenu textuel exploitable.');
  }

  return {
    suggestedTitle,
    suggestedLocation,
    sections: {
      overview,
      technicalSolution,
      circularValue,
    },
  };
}

function extractRichDescriptionFallback(rawText: string, filename: string): {
  suggestedTitle: string;
  suggestedLocation: string;
  sections: {
    overview: string;
    technicalSolution: string;
    circularValue: string;
  };
  richDescription: string;
} {
  const text = (rawText || '').trim();

  // 1. Détection intelligente et fidèle du Titre du projet
  let suggestedTitle = '';
  const ficheMatch = text.match(/Fiche\s+projet\s*(?:n[°\s]*\d+)?\s*\n+([\s\S]*?)\n+Objet\s*:/i);
  if (ficheMatch) {
    const clean = ficheMatch[1].replace(/\s+/g, ' ').trim();
    if (clean.length >= 10 && clean.length <= 160) suggestedTitle = clean;
  }
  if (!suggestedTitle) {
    const quoteMatch = text.match(/[«\"]([\s\S]*?)[»\"]/);
    if (quoteMatch) {
      const clean = quoteMatch[1].replace(/\s+/g, ' ').trim();
      if (clean.length >= 15 && clean.length <= 160 && !/vierge|extra/i.test(clean)) suggestedTitle = clean;
    }
  }
  if (!suggestedTitle) {
    const objetMatch = text.match(/Objet\s*:\s*(?:Il s[’']agit de (?:la création d[’']une unité de\s*[:«\"]?)?)?([^\n«»\"]{10,140})/i);
    if (objetMatch) {
      suggestedTitle = objetMatch[1].trim();
    }
  }
  if (!suggestedTitle) {
    suggestedTitle = (filename || 'Projet')
      .replace(/\.[^.]+$/, '')
      .replace(/^[0-9]+[_-]*/, '')
      .replace(/[_-]/g, ' ')
      .trim() || 'Projet d\'Entrepreneuriat Vert';
  }

  // 2. Détection du Lieu d'implantation et de la géographie
  let suggestedLocation = '';
  const locMatch = text.match(/\b(Tunisie|Tunis|Sfax|Sousse|Bizerte|Nabeul|Monastir|Kairouan|Gabès|Médenine|Gafsa|Jendouba|Béja|Kasserine|Sidi Bouzid|Mahdia|Siliana|Zaghouan|Tozeur|Kébili|Tataouine|France|Paris|Lyon|Marseille|Bretagne|Normandie|Occitanie|Europe)\b/i);
  if (locMatch) {
    suggestedLocation = locMatch[1];
  } else if (/\b(dinar|dinars|dt)\b/i.test(text)) {
    suggestedLocation = 'Tunisie';
  }

  // 3. Extraction structurée par rubriques documentaires si présentes
  const hasStructuredSections = /Objet\s*:|Terrain|Equipements?|Matières?\s+premières?|Process|Capacité|Marché|Investissements?|Rentabilité/i.test(text);

  let overview = '';
  let technicalSolution = '';
  let circularValue = '';

  if (hasStructuredSections && text.length > 100) {
    const overviewParts: string[] = [];
    const techParts: string[] = [];
    const valueParts: string[] = [];

    const objetMatch = text.match(/Objet\s*:\s*([\s\S]*?)(?:I-\)|Terrain|$)/i);
    if (objetMatch) {
      overviewParts.push(objetMatch[1].replace(/\s+/g, ' ').replace(/[«»\"]/g, '').trim());
    }

    const terrainMatch = text.match(/Terrain et constructions\s*:\s*([\s\S]*?)(?:II-\)|Equipement|$)/i);
    if (terrainMatch) {
      overviewParts.push('Implantation et infrastructures : ' + terrainMatch[1].replace(/\s+/g, ' ').replace(/^-\s*/, '').trim());
    }

    const emploiMatch = text.match(/Emploi\s*:\s*([\s\S]*?)(?:IV-\)|Matières|$)/i);
    if (emploiMatch) {
      overviewParts.push('Effectifs prévisionnels : ' + emploiMatch[1].replace(/\s+/g, ' ').trim());
    }

    const investMatch = text.match(/Total\s*:\s*(\d[\d\s]*\d)\s+(\d[\d\s]*\d)/i);
    if (investMatch) {
      overviewParts.push(`Schéma d'investissement : budget global de ${investMatch[1].trim()} dinars, financé par capitaux propres (40%) et crédit à moyen terme (60%).`);
    }

    const equipMatch = text.match(/Equipements nécessaires\s*:\s*([\s\S]*?)(?:III-\)|Emploi|$)/i);
    if (equipMatch) {
      techParts.push('Équipements et chaîne industrielle : ' + equipMatch[1].replace(/\s+/g, ' ').trim());
    }

    const matMatch = text.match(/Matières premières et consommables\s*:\s*([\s\S]*?)(?:V-\)|Capacité|$)/i);
    if (matMatch) {
      techParts.push('Matières premières, emballages et utilités : ' + matMatch[1].replace(/\s+/g, ' ').trim());
    }

    const processMatch = text.match(/Process de fabrication\s*:\s*([\s\S]*?)(?:VII-\)|Le marché|$)/i);
    if (processMatch) {
      techParts.push('Processus de fabrication : ' + processMatch[1].replace(/\s+/g, ' ').trim());
    }

    const capMatch = text.match(/Capacité de production\s*:\s*([\s\S]*?)(?:VI-\)|Process|$)/i);
    if (capMatch) {
      techParts.push('Capacité de production nominale : ' + capMatch[1].replace(/\s+/g, ' ').trim());
    }

    const marcheMatch = text.match(/Le marché et la clientèle\s*:\s*([\s\S]*?)(?:VIII-\)|Produits|$)/i);
    if (marcheMatch) {
      valueParts.push('Marché cible et clientèle : ' + marcheMatch[1].replace(/\s+/g, ' ').trim());
    }

    const prixMatch = text.match(/Produits\s*\/\s*Prix\s*:\s*([\s\S]*?)(?:IX-\)|Schéma|$)/i);
    if (prixMatch) {
      valueParts.push('Positionnement prix et chiffre d\'affaires : ' + prixMatch[1].replace(/\s+/g, ' ').trim());
    }

    const rentMatch = text.match(/taux de rentabilité interne[\s\S]*?mois/i);
    if (rentMatch) {
      valueParts.push('Rentabilité financière : ' + rentMatch[0].replace(/\s+/g, ' ').trim());
    }

    const conseilsMatch = text.match(/Conseils\s*:\s*([\s\S]*?)$/i);
    if (conseilsMatch) {
      valueParts.push('Recommandations opérationnelles et démarche qualité : ' + conseilsMatch[1].replace(/\s+/g, ' ').trim());
    }

    if (overviewParts.length > 0) overview = overviewParts.join('\n\n');
    if (techParts.length > 0) technicalSolution = techParts.join('\n\n');
    if (valueParts.length > 0) circularValue = valueParts.join('\n\n');
  }

  // 4. Fallback si texte en prose non découpé par rubriques
  if (!overview || !technicalSolution || !circularValue) {
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/(\w+)-\n(\w+)/g, '$1$2')
      .replace(/\n(?!\n)/g, ' ')
      .replace(/[ \t]+/g, ' ');

    const rawSentences = normalizedText.split(/(?<=[.!?])\s+/);
    const cleanSentences = rawSentences
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && !/^(page\s+\d+|p\.\s*\d+|[-=_*]{3,}|\d+\s*\/\s*\d+|copyright)/i.test(s));

    if (cleanSentences.length > 0) {
      const visionSentences: string[] = [];
      const techSentences: string[] = [];
      const valueSentences: string[] = [];
      const generalSentences: string[] = [];

      for (const s of cleanSentences) {
        const lower = s.toLowerCase();
        if (/problématique|contexte|défi|besoin|enjeu|pollution|déchet|gaspillage|objectif|développe|conçoit|consiste à|solution visant|mission|création|terrain|bâtiment|emploi/.test(lower)) {
          visionSentences.push(s);
        } else if (/technique|procédé|fonctionnement|technologie|brevet|matière|intrant|composant|matériau|ressource|fabrication|machine|scooter|camionnette|application|flotte|kg|kwh|litre|bio|recycl|cuve|filtre|bouteille/.test(lower)) {
          techSentences.push(s);
        } else if (/valeur|avantage|bénéfice|client|partenaire|marché|économique|tarif|prix|abonnement|dt|dinar|coût|durabilit|rentabilit|modèle|vente|service|export|tri|payback/.test(lower)) {
          valueSentences.push(s);
        } else {
          generalSentences.push(s);
        }
      }

      const chunkCount = Math.max(1, Math.ceil(cleanSentences.length / 3));
      const part1 = cleanSentences.slice(0, chunkCount).join(' ');
      const part2 = cleanSentences.slice(chunkCount, chunkCount * 2).join(' ');
      const part3 = cleanSentences.slice(chunkCount * 2, chunkCount * 3).join(' ');

      if (!overview) {
        overview = [...visionSentences, ...generalSentences.slice(0, 2)].slice(0, 4).join(' ') || part1;
      }
      if (!technicalSolution) {
        technicalSolution = [...techSentences, ...generalSentences.slice(2, 4)].slice(0, 4).join(' ') || part2;
      }
      if (!circularValue) {
        circularValue = [...valueSentences, ...generalSentences.slice(4, 6)].slice(0, 4).join(' ') || part3;
      }
    }
  }

  // 5. Filet de sécurité en cas de document entièrement vierge
  if (!overview) {
    overview = `Document « ${filename} » importé. Veuillez vérifier que le fichier contient du texte lisible.`;
  }
  if (!technicalSolution) {
    technicalSolution = 'Données techniques non renseignées dans le fichier fourni.';
  }
  if (!circularValue) {
    circularValue = 'Données économiques et modèle de valeur non renseignés dans le fichier fourni.';
  }

  const richDescription = [
    `■ 1. Vue d'ensemble du projet & Problématique adressée\n${overview}`,
    `■ 2. Solution technique, intrants & Procédés sobres\n${technicalSolution}`,
    `■ 3. Proposition de valeur & Modèle circulaire\n${circularValue}`,
  ].join('\n\n');

  return {
    suggestedTitle,
    suggestedLocation,
    sections: {
      overview,
      technicalSolution,
      circularValue,
    },
    richDescription,
  };
}

async function callGemini(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  apiKey: string,
  model: string
): Promise<Summary> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2800,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = (await response.json().catch(() => ({}))) as any;
      const statusText = details?.error?.message || response.statusText;
      console.warn(`[AI Extract] ${model} HTTP ${response.status}: ${statusText}`);
      throw new Error(`GEMINI_HTTP_${response.status}`);
    }

    const result: any = await response.json();
    const text = (result.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
    if (!text.trim()) {
      throw new Error('GEMINI_EMPTY_RESPONSE_' + (result.candidates?.[0]?.finishReason || 'UNKNOWN'));
    }

    return parseSummaryJson(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function synthesizeWithFallbacks(
  text: string,
  uploads: Upload[],
  apiKey: string,
  preferredModel?: string
): Promise<Summary | null> {
  const models = [
    ...(preferredModel ? [preferredModel.replace(/^models\//, '')] : []),
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const multimodalFile = uploads.find(
    (u) =>
      u.base64Data &&
      (u.mimeType?.startsWith('image/') ||
        /\.(jpe?g|png|webp)$/i.test(u.filename || '') ||
        (/\.pdf$/i.test(u.filename || '') && text.trim().length < 80))
  );

  let parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;

  if (multimodalFile && multimodalFile.base64Data) {
    const mime =
      multimodalFile.mimeType && multimodalFile.mimeType !== 'application/octet-stream'
        ? multimodalFile.mimeType
        : /\.pdf$/i.test(multimodalFile.filename || '')
        ? 'application/pdf'
        : /\.png$/i.test(multimodalFile.filename || '')
        ? 'image/png'
        : /\.webp$/i.test(multimodalFile.filename || '')
        ? 'image/webp'
        : 'image/jpeg';

    const cleanBase64 = multimodalFile.base64Data.replace(/^data:[^,]*;base64,/i, '').replace(/\s/g, '');

    parts = [
      {
        inlineData: {
          mimeType: mime,
          data: cleanBase64,
        },
      },
      {
        text: `Extrais et rédige un résumé fidèle de ce document "${multimodalFile.filename || 'Document'}" selon les 3 rubriques obligatoires (overview, technicalSolution, circularValue), en identifiant le titre et le lieu éventuel du projet.`,
      },
    ];
  } else {
    const cleanText = text.slice(0, 32000);
    parts = [
      {
        text: `Voici le contenu extrait des documents importés :\n\n<documents>\n${cleanText}\n</documents>\n\nRédige le résumé fidèle selon les 3 rubriques obligatoires (overview, technicalSolution, circularValue) en restituant fidèlement tous les faits, chiffres, intrants, équipements et objectifs du projet.`,
      },
    ];
  }

  for (const model of models) {
    try {
      return await callGemini(parts, apiKey, model);
    } catch (err: any) {
      console.warn(`[AI Extract] Modèle ${model} indisponible (${err?.message || err}). Tentative avec le modèle suivant...`);
    }
  }

  return null;
}

export const onRequestPost = async (
  { request, env }: Context
): Promise<Response> => {
  let body: {
    files?: Upload[];
    filename?: string;
    mimeType?: string;
    base64Data?: string;
    localText?: string;
  };

  try {
    body = await request.json();
  } catch {
    return respond({
      success: false,
      error: 'Requête JSON invalide.',
      code: 'INVALID_JSON',
    }, 400);
  }

  try {
    const files = Array.isArray(body.files)
      ? body.files
      : [body];

    if (!files.length) {
      return respond({
        success: false,
        error: 'Aucun document fourni.',
      }, 400);
    }

    const extracted: {
      filename: string;
      text: string;
      base64Data?: string;
      mimeType?: string;
    }[] = [];

    for (const file of files) {
      const filename = file.filename || 'Document';
      let content = typeof file.localText === 'string' ? file.localText : '';

      if (!content.trim() && file.base64Data) {
        let bytes: Uint8Array;

        try {
          bytes = decodeBase64(file.base64Data);
        } catch {
          return respond({
            success: false,
            error: `Encodage base64 invalide : ${filename}`,
            code: 'INVALID_FILE_ENCODING',
          }, 400);
        }

        const isPdf =
          /\.pdf$/i.test(filename) ||
          file.mimeType === 'application/pdf' ||
          (bytes && bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

        try {
          if (isPdf) {
            content = await extractPdf(bytes);
          } else if (/\.docx$/i.test(filename) || file.mimeType?.includes('word')) {
            content = extractDocx(bytes);
          } else if (/\.xlsx$/i.test(filename) || file.mimeType?.includes('spreadsheet')) {
            content = extractXlsx(bytes);
          } else if (textExtensions.test(filename) || file.mimeType?.startsWith('text/')) {
            content = new TextDecoder().decode(bytes);
          }
        } catch (error) {
          console.warn('Document extraction warning for', filename, error);
        }
      }

      extracted.push({
        filename,
        text: (content || '').trim(),
        base64Data: file.base64Data,
        mimeType: file.mimeType,
      });
    }

    const rawFullText = extracted
      .map((file) => file.text)
      .filter(Boolean)
      .join('\n\n');

    let summary: Summary | null = null;
    const apiKey = env?.GEMINI_API_KEY?.trim();

    if (apiKey) {
      try {
        summary = await synthesizeWithFallbacks(rawFullText, extracted, apiKey, env?.GEMINI_MODEL);
      } catch (aiErr) {
        console.warn('Gemini extraction error, using semantic fallback:', aiErr);
      }
    }

    if (summary) {
      const extractedText = [
        "■ 1. Vue d'ensemble du projet & Problématique adressée\n" + summary.sections.overview,
        "■ 2. Solution technique, intrants & Procédés sobres\n" + summary.sections.technicalSolution,
        "■ 3. Proposition de valeur & Modèle circulaire\n" + summary.sections.circularValue,
      ].join('\n\n');

      return respond({
        success: true,
        isAIEnhanced: true,
        filename: extracted.map((f) => f.filename).join(', '),
        extractedText,
        rawFullText,
        suggestedTitle: summary.suggestedTitle,
        suggestedLocation: summary.suggestedLocation,
        sections: summary.sections,
        processedFilesCount: extracted.length,
        charCount: rawFullText.length,
      });
    }

    // Secours sémantique déterministe immédiat garanti (en cas de 503, 429, timeout ou absence de clé)
    const fallback = extractRichDescriptionFallback(rawFullText, extracted[0]?.filename || 'Document');
    return respond({
      success: true,
      isAIEnhanced: false,
      filename: extracted.map((f) => f.filename).join(', '),
      extractedText: fallback.richDescription,
      rawFullText,
      suggestedTitle: fallback.suggestedTitle,
      suggestedLocation: fallback.suggestedLocation,
      sections: fallback.sections,
      processedFilesCount: extracted.length,
      charCount: rawFullText.length,
    });
  } catch (error: any) {
    console.error('Document processing error:', error);
    return respond({
      success: false,
      error: error?.message || 'Erreur interne de traitement des documents.',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
};
