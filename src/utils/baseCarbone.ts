import type { AdemeReferenceFactor } from '../types.ts';
import {
  BASE_CARBONE_VERSION,
  BASE_CARBONE_SOURCE_SHA256,
  getIndexStats,
  searchLocalFactors,
  type LocalFactor,
} from '../data/baseCarboneIndex.ts';

export { getIndexStats as getBaseCarboneIndexStatus, BASE_CARBONE_VERSION };

const ADEME_BASE_CARBONE_LINES_URL =
  'https://data.ademe.fr/data-fair/api/v1/datasets/base-carboner/lines';

const BASE_QS =
  'Type_Ligne:"Elément" AND Type_de_l\'élément:"Facteur d\'émission" AND NOT Statut_de_l\'élément:"Archivé"';

const SELECT_FIELDS = [
  "Identifiant_de_l'élément",
  'Nom_base_français',
  'Nom_attribut_français',
  'Code_de_la_catégorie',
  'Total_poste_non_décomposé',
  'Unité_français',
  'Localisation_géographique',
  'Sous-localisation_géographique_français',
  'Incertitude',
  "Statut_de_l'élément",
  'Date_de_modification',
].join(',');

interface CacheEntry {
  expiresAt: number;
  data: AdemeReferenceFactor[];
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/** Live API rows are labelled distinctly from the frozen local V23.11 index. */
const LIVE_API_VERSION = 'API-live';

function mapRowToFactor(row: any): AdemeReferenceFactor | null {
  if (!row) return null;
  const rawVal = Number(row['Total_poste_non_décomposé']);
  const name = typeof row['Nom_base_français'] === 'string' ? row['Nom_base_français'].trim() : '';
  const unit = typeof row['Unité_français'] === 'string' ? row['Unité_français'].trim() : '';

  if (!name || !unit || !Number.isFinite(rawVal)) return null;

  const id = String(row["Identifiant_de_l'élément"] || row._id || '');
  const attr =
    typeof row['Nom_attribut_français'] === 'string' && row['Nom_attribut_français'].trim()
      ? row['Nom_attribut_français'].trim()
      : undefined;
  const geo =
    typeof row['Localisation_géographique'] === 'string' && row['Localisation_géographique'].trim()
      ? row['Localisation_géographique'].trim()
      : 'France / International';
  const subGeo =
    typeof row['Sous-localisation_géographique_français'] === 'string' &&
    row['Sous-localisation_géographique_français'].trim()
      ? row['Sous-localisation_géographique_français'].trim()
      : undefined;
  const uncertaintyRaw = Number(row['Incertitude']);
  const validity =
    typeof row['Date_de_modification'] === 'string' && row['Date_de_modification'].trim()
      ? row['Date_de_modification'].trim()
      : undefined;

  return {
    id,
    name,
    ...(attr ? { attribute: attr } : {}),
    category:
      typeof row['Code_de_la_catégorie'] === 'string' && row['Code_de_la_catégorie'].trim()
        ? row['Code_de_la_catégorie'].trim()
        : 'Base Carbone ADEME',
    factorKgCO2e: rawVal,
    unit,
    geography: subGeo ? `${geo} (${subGeo})` : geo,
    ...(Number.isFinite(uncertaintyRaw) && uncertaintyRaw > 0 ? { uncertaintyPct: uncertaintyRaw } : {}),
    ...(validity ? { validity } : {}),
    version: LIVE_API_VERSION,
    source: 'ADEME Base Carbone® (API live — repli)',
  };
}

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
 * Deterministic, offline-first factor lookup.
 *
 * The local V23.11 index is authoritative: the same query always returns the
 * same factors, so an audit can be reproduced without network access. The live
 * ADEME API is only consulted when the local index has too few candidates.
 */
export async function searchBaseCarbone(
  query: string,
  options?: { size?: number; timeoutMs?: number; unitHint?: string; categoryHint?: string }
): Promise<AdemeReferenceFactor[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const size = Math.min(25, Math.max(1, options?.size ?? 8));
  const timeoutMs = options?.timeoutMs ?? 4000;
  const cacheKey = `${BASE_CARBONE_VERSION}::${cleanQuery.toLowerCase()}::${size}::${options?.unitHint || ''}`;

  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const factors: AdemeReferenceFactor[] = [];
  const seen = new Set<string>();

  // 1. Authoritative local index (no network, no fuzzy API ranking).
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

  // 2. Live API fallback for concepts missing from the local index.
  if (factors.length < Math.min(size, 3)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url =
        `${ADEME_BASE_CARBONE_LINES_URL}?size=${size}` +
        `&q=${encodeURIComponent(cleanQuery)}` +
        `&qs=${encodeURIComponent(BASE_QS)}` +
        `&select=${encodeURIComponent(SELECT_FIELDS)}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (res.ok) {
        const data: any = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : [];
        for (const row of rows) {
          const factor = mapRowToFactor(row);
          if (!factor || !factor.id || seen.has(factor.id)) continue;
          seen.add(factor.id);
          factors.push(factor);
        }
      }
    } catch {
      // Offline is a supported mode: keep the local results.
    } finally {
      clearTimeout(timer);
    }
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
RÉFÉRENTIEL OFFICIEL ADEME BASE CARBONE® — VERSION ${BASE_CARBONE_VERSION} (index local figé, source de vérité reproductible ; SHA256 ${BASE_CARBONE_SOURCE_SHA256.slice(0, 16)}…) :
${lines.join('\n')}

RÈGLES DE CALCUL CARBONE — OBLIGATOIRES ET NON NÉGOCIABLES :
- Utilise UNIQUEMENT les facteurs ci-dessus (ADEME Base Carbone® ${BASE_CARBONE_VERSION}) pour calibrer les émissions de chaque étape du cycle de vie (ISO 14067:2018 / ISO 14064-1:2018).
- Applique rigoureusement les conversions d'unités entre l'unité du facteur et l'Unité Fonctionnelle du projet. Ne jamais moyenner des facteurs exprimés dans des unités différentes.
- INTERDICTION ABSOLUE d'inventer, d'approximer ou de remplacer un facteur ADEME par une valeur mémorisée : si aucun facteur ne correspond exactement, cite le plus proche et signale explicitement l'incertitude.
- Cite explicitement l'identifiant [ADEME ID #xxxxx], la valeur, l'unité et l'incertitude dans les descriptions des étapes, dans benchmarkComparison.commentary et dans le tableau ademeReferenceFactors (champs id, name, factorKgCO2e, unit, uncertaintyPct, source).
- La somme des émissions des 6 étapes doit être cohérente avec totalCarbonKgCO2e. Toute valeur non traçable à un ID ADEME est invalide.`;

    return { factors: topFactors, promptBlock };
  } catch {
    return { factors: [], promptBlock: '' };
  }
}
