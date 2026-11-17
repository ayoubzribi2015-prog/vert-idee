import type { AdemeReferenceFactor } from '../types.ts';
import {
  BASE_CARBONE_VERSION,
  BASE_CARBONE_SOURCE_SHA256,
  getIndexStats,
  searchLocalFactors,
  type LocalFactor,
} from '../data/baseCarboneIndex.ts';

export { getIndexStats as getBaseCarboneIndexStatus, BASE_CARBONE_VERSION };

/** Stable API identifier for the single, frozen reference dataset. */
export const BASE_CARBONE_DATASET = `base-carbone-${BASE_CARBONE_VERSION}-local`;
/** Public documentation of the ADEME Base Empreinte® / Base Carbone® reference. */
export const BASE_CARBONE_DOC_URL = 'https://base-empreinte.ademe.fr/documentation/base-carbone';

interface CacheEntry {
  expiresAt: number;
  data: AdemeReferenceFactor[];
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/** Map a local V23.11 factor to the public API shape, keeping full provenance. */
function mapLocalFactorToFactor(f: LocalFactor, matchScore?: number): AdemeReferenceFactor {
  const geo = f.geography || 'France / International';
  return {
    id: f.id,
    name: f.name,
    ...(f.attribute ? { attribute: f.attribute } : {}),
    category: f.category || 'Base Carbone ADEME',
    factorKgCO2e: f.value,
    unit: f.unit,
    geography: f.subGeography ? `${geo} (${f.subGeography})` : geo,
    ...(f.uncertaintyPct !== null && f.uncertaintyPct > 0 ? { uncertaintyPct: f.uncertaintyPct } : {}),
    version: f.version,
    ...(f.validity ? { validity: f.validity } : {}),
    ...(f.program ? { program: f.program } : {}),
    ...(f.source ? { sourceDetail: f.source } : {}),
    ...(matchScore !== undefined ? { matchScore } : {}),
    source: `ADEME Base Carbone® ${BASE_CARBONE_VERSION}${f.program ? ` — ${f.program}` : ''}`,
  };
}

/**
 * Deterministic, offline-only factor lookup.
 *
 * The frozen local V23.11 index (downloaded from the ADEME Base Empreinte®
 * / Base Carbone® reference) is the SINGLE source of truth: no network call is
 * made, so the same query always returns the same factors and no older version
 * can leak into an audit. `timeoutMs` is kept for API compatibility only.
 */
export async function searchBaseCarbone(
  query: string,
  options?: { size?: number; timeoutMs?: number; unitHint?: string; categoryHint?: string }
): Promise<AdemeReferenceFactor[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const size = Math.min(25, Math.max(1, options?.size ?? 8));
  const cacheKey = `${BASE_CARBONE_VERSION}::${cleanQuery.toLowerCase()}::${size}::${options?.unitHint || ''}`;

  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const factors: AdemeReferenceFactor[] = [];
  const seen = new Set<string>();
  for (const local of searchLocalFactors(cleanQuery, {
    size,
    unitHint: options?.unitHint,
    categoryHint: options?.categoryHint,
  })) {
    const factor = mapLocalFactorToFactor(local, local.matchScore);
    if (!factor.id || seen.has(factor.id)) continue;
    seen.add(factor.id);
    factors.push(factor);
  }

  queryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: factors,
  });
  return factors;
}

interface KeywordRule {
  pattern: RegExp;
  query: string;
}

const DOMAIN_QUERY_RULES: KeywordRule[] = [
  { pattern: /\b(tunisi\w*|sfax|sousse|gab[eè]s|bizerte|nabeul|monastir|kairouan)\b/i, query: 'Tunisie' },
  { pattern: /\b(maroc\w*|casablanca|rabat|tanger)\b/i, query: 'Maroc' },
  { pattern: /\b(alg[eé]ri\w*|alger|oran)\b/i, query: 'Algérie' },
  { pattern: /\b(solaire\w*|photovolta[iï]que\w*|pv|panneau\w*)\b/i, query: 'Electricité photovoltaïque' },
  { pattern: /\b([eé]lectricit[eé]\w*|kWh|[eé]nergie\w*|[eé]clairage\w*|serveur\w*|cloud|ia|num[eé]rique\w*|logiciel\w*|saas|plateforme\w*)\b/i, query: 'Electricité mix moyen kWh' },
  { pattern: /\b(gaz\s+naturel|chaudi[eè]re\w*|thermique\w*|cuisson|four\w*)\b/i, query: 'Gaz naturel kWh PCI' },
  { pattern: /\b(biogaz|biom[eé]thane|m[eé]thanis\w*|digesteur\w*|margine\w*|d[eé]chet\w*.*organique\w*)\b/i, query: 'Biométhane biogaz' },
  { pattern: /\b(plastique\w*|pehd|pebd|pet|pp|poly[eé]thyl[eè]ne|polym[eè]re\w*|semelle\w*|pu|tpu|emballage\w*\s+plastique\w*)\b/i, query: 'Plastique PEHD tonne' },
  { pattern: /\b(carton\w*|papier\w*|emballage\w*|conditionnement\w*|bo[iî]te\w*)\b/i, query: 'Carton' },
  { pattern: /\b(acier\w*|m[eé]ta[ul]x?|fer|aluminium|ch[aâ]ssis|usinage\w*)\b/i, query: 'Acier tonne' },
  { pattern: /\b(ciment\w*|b[eé]ton\w*|gypse|pl[aâ]tre|brique\w*|carri[eè]re\w*|construction\w*)\b/i, query: 'Ciment Portland tonne' },
  { pattern: /\b(transport\w*|logistique\w*|livraison\w*|camion\w*|fret|routier\w*|exp[eé]dition\w*)\b/i, query: '"Transport de marchandises" routier' },
  { pattern: /\b(maritime\w*|port\w*|conteneur\w*|export\w*)\b/i, query: '"Transport de marchandises" maritime' },
  { pattern: /\b(compost\w*|engrais|azote\w*|agriculture\w*|agro\w*|olivier\w*|grignon\w*|biomasse\w*)\b/i, query: 'Compost engrais azote' },
  { pattern: /\b(eau\w*|effluent\w*|d[eé]pollution\w*|step|zld|hydrique\w*)\b/i, query: 'Traitement eaux usées' },
  { pattern: /\b(textile\w*|coton\w*|cuir\w*|chaussure\w*|v[eê]tement\w*)\b/i, query: 'Textile coton tonne' },
  { pattern: /\b(d[eé]chet\w*|recyclage\w*|recycl[eé]\w*|enfouissement\w*|d[eé]charge\w*|valorisation\w*)\b/i, query: 'Déchets recyclage tonne' },
];

export function extractBaseCarboneQueries(params: {
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  fullDocumentContent?: string;
}): string[] {
  const combined = [
    params.title || '',
    params.sector || '',
    params.location || '',
    params.description || '',
    (params.fullDocumentContent || '').slice(0, 6000),
  ].join(' ');

  const selected: string[] = [];
  for (const rule of DOMAIN_QUERY_RULES) {
    if (rule.pattern.test(combined) && !selected.includes(rule.query)) {
      selected.push(rule.query);
    }
    if (selected.length >= 6) break;
  }

  // Always ensure at least a foundational baseline (local electricity + freight transport)
  if (selected.length === 0) {
    selected.push('Electricité mix moyen kWh', '"Transport de marchandises" routier', 'Carton');
  } else if (selected.length < 3) {
    for (const fallbackQ of ['Electricité mix moyen kWh', '"Transport de marchandises" routier']) {
      if (!selected.includes(fallbackQ)) selected.push(fallbackQ);
    }
  }

  return selected.slice(0, 6);
}

export async function fetchContextualBaseCarboneFactors(params: {
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  fullDocumentContent?: string;
  timeoutMs?: number;
}): Promise<{ factors: AdemeReferenceFactor[]; promptBlock: string }> {
  const queries = extractBaseCarboneQueries(params);
  const timeoutMs = params.timeoutMs ?? 4500;

  try {
    const batches = await Promise.all(
      queries.map((q) => searchBaseCarbone(q, { size: 3, timeoutMs }))
    );

    const deduped: AdemeReferenceFactor[] = [];
    const seen = new Set<string>();
    for (const batch of batches) {
      for (const item of batch) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
    }

    const topFactors = deduped.slice(0, 12);
    if (topFactors.length === 0) {
      return { factors: [], promptBlock: '' };
    }

    const lines = topFactors.map((f) => {
      const label = f.attribute ? `${f.name} (${f.attribute})` : f.name;
      const inc = f.uncertaintyPct ? ` | incertitude ±${f.uncertaintyPct}%` : '';
      const prov = f.program ? ` | programme: ${f.program}` : '';
      return `- [ADEME ID #${f.id}] ${label} = ${f.factorKgCO2e} ${f.unit} | catégorie: ${f.category} | localisation: ${f.geography}${inc}${prov}`;
    });

    const promptBlock = `
RÉFÉRENTIEL OFFICIEL ADEME BASE EMPREINTE® / BASE CARBONE® — VERSION ${BASE_CARBONE_VERSION} (index local figé, source de vérité unique et reproductible ; SHA256 ${BASE_CARBONE_SOURCE_SHA256.slice(0, 16)}…) :
${lines.join('\n')}

RÈGLES DE CALCUL CARBONE — OBLIGATOIRES ET NON NÉGOCIABLES :
- Utilise UNIQUEMENT les facteurs ci-dessus (ADEME Base Empreinte® / Base Carbone® ${BASE_CARBONE_VERSION}, référentiel figé, sans repli réseau) pour calibrer les émissions de chaque étape du cycle de vie (ISO 14067:2018 / ISO 14064-1:2018).
- Applique rigoureusement les conversions d'unités entre l'unité du facteur et l'Unité Fonctionnelle du projet. Ne jamais moyenner des facteurs exprimés dans des unités différentes.
- INTERDICTION ABSOLUE d'inventer, d'approximer ou de remplacer un facteur ADEME par une valeur mémorisée : si aucun facteur ne correspond exactement, cite le plus proche et signale explicitement l'incertitude.
- Cite explicitement l'identifiant [ADEME ID #xxxxx], la valeur, l'unité et l'incertitude dans les descriptions des étapes, dans benchmarkComparison.commentary et dans le tableau ademeReferenceFactors (champs id, name, factorKgCO2e, unit, uncertaintyPct, source).
- Chaque étape du cycle de vie doit être calculée par des postes factorApplications : emissionKgCO2e = quantity × factorKgCO2e, avec l'ID ADEME et l'unité du facteur. La quantité est exprimée POUR l'unité fonctionnelle du projet.
- L'émission d'une étape est la somme de ses factorApplications et totalCarbonKgCO2e est la somme des émissions des 6 étapes.
- Si aucun facteur ne correspond exactement à une étape, utilise le facteur ADEME le plus proche en signalant son incertitude. Ne renvoie JAMAIS 0 pour une étape faute de facteur exact.`;

    return { factors: topFactors, promptBlock };
  } catch {
    return { factors: [], promptBlock: '' };
  }
}
