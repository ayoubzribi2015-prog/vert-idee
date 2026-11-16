import type { AdemeReferenceFactor } from '../types.ts';

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
    source: 'ADEME Base Carbone®',
  };
}

export async function searchBaseCarbone(
  query: string,
  options?: { size?: number; timeoutMs?: number }
): Promise<AdemeReferenceFactor[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const size = Math.min(25, Math.max(1, options?.size ?? 8));
  const timeoutMs = options?.timeoutMs ?? 4000;
  const cacheKey = `${cleanQuery.toLowerCase()}::${size}`;

  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

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

    if (!res.ok) {
      return [];
    }

    const data: any = await res.json();
    const rows = Array.isArray(data?.results) ? data.results : [];
    const seen = new Set<string>();
    const factors: AdemeReferenceFactor[] = [];

    for (const row of rows) {
      const factor = mapRowToFactor(row);
      if (!factor || !factor.id || seen.has(factor.id)) continue;
      seen.add(factor.id);
      factors.push(factor);
    }

    queryCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: factors,
    });
    return factors;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
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
  { pattern: /\b(carton\w*|papier\w*|emballage\w*|conditionnement\w*|bo[iî]te\w*)\b/i, query: 'Emballages Carton' },
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
    selected.push('Electricité mix moyen kWh', '"Transport de marchandises" routier', 'Emballages Carton');
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
      const inc = f.uncertaintyPct ? ` | Incertitude: ±${f.uncertaintyPct}%` : '';
      return `- [ADEME ID #${f.id}] ${label} = ${f.factorKgCO2e} ${f.unit} | Catégorie: ${f.category} | Loc: ${f.geography}${inc}`;
    });

    const promptBlock = `
RÉFÉRENTIEL OFFICIEL ADEME BASE CARBONE® (data.ademe.fr/datasets/base-carboner — Facteurs d'émission vérifiés en ligne) :
${lines.join('\n')}
CONSIGNE OBLIGATOIRE DE CALCUL CARBONE :
- Utilise ces facteurs d'émission officiels ADEME Base Carbone® ci-dessus (en appliquant rigoureusement les conversions d'unités vers l'Unité Fonctionnelle du projet) pour calibrer les émissions de chaque étape du cycle de vie (ISO 14067 / ISO 14064-1).
- Cite explicitement les identifiants [ADEME ID #xxxxx] et facteurs utilisés dans les descriptions des étapes, dans commentary et dans ademeReferenceFactors.`;

    return { factors: topFactors, promptBlock };
  } catch {
    return { factors: [], promptBlock: '' };
  }
}
