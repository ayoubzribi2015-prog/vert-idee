import type { AdemeReferenceFactor } from '../types.ts';
import {
  BASE_CARBONE_VERSION,
  BASE_CARBONE_SOURCE_SHA256,
  getIndexStats,
  searchLocalFactors,
  resolveFactorById,
  type LocalFactor,
  type AcvStageCategory,
} from '../data/baseCarboneIndex.ts';

export { getIndexStats as getBaseCarboneIndexStatus, BASE_CARBONE_VERSION, resolveFactorById };
export type { AcvStageCategory };

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
export function mapLocalFactorToFactor(
  f: LocalFactor,
  matchScore?: number,
  appliedStage?: string
): AdemeReferenceFactor {
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
    ...(appliedStage ? { appliedStage } : {}),
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
  options?: {
    size?: number;
    timeoutMs?: number;
    unitHint?: string;
    categoryHint?: string;
    stageCategory?: AcvStageCategory;
    geographyHint?: string;
  }
): Promise<AdemeReferenceFactor[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const size = Math.min(25, Math.max(1, options?.size ?? 8));
  const cacheKey = `${BASE_CARBONE_VERSION}::${cleanQuery.toLowerCase()}::${size}::${options?.unitHint || ''}::${options?.categoryHint || ''}::${options?.stageCategory || ''}::${options?.geographyHint || ''}`;

  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const factors: AdemeReferenceFactor[] = [];
  const seen = new Set<string>();
  for (const local of searchLocalFactors(cleanQuery, {
    size,
    unitHint: options?.unitHint,
    categoryHint: options?.categoryHint,
    stageCategory: options?.stageCategory,
    geographyHint: options?.geographyHint,
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

interface StageQueryRule {
  pattern: RegExp;
  query: string;
  stage: AcvStageCategory;
  categoryHint?: string;
  unitHint?: string;
  geographyHint?: string;
}

const STAGE_LABEL_FR: Record<AcvStageCategory, string> = {
  raw_materials: '1. Approvisionnement & Matières premières (Cat. 4)',
  manufacturing: '2. Fabrication, Énergie & Procédés (Cat. 1-2)',
  packaging: '3. Conditionnement & Emballages (Cat. 4)',
  transport: '4. Transport & Logistique (Cat. 3)',
  usage: '5. Utilisation & Exploitation (Cat. 5)',
  end_of_life: '6. Fin de vie & Traitement des déchets (Cat. 5)',
};

const STAGE_QUERY_RULES: StageQueryRule[] = [
  // --- Geography / Electricity mixes (manufacturing & usage) ---
  {
    pattern: /\b(tunisi\w*|sfax|sousse|gab[eè]s|bizerte|nabeul|monastir|kairouan|steg)\b/i,
    query: 'Electricité mix moyen Tunisie',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
    geographyHint: 'Tunisie',
  },
  {
    pattern: /\b(maroc\w*|casablanca|rabat|tanger|onee)\b/i,
    query: 'Electricité mix moyen Maroc',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
    geographyHint: 'Maroc',
  },
  {
    pattern: /\b(alg[eé]ri\w*|alger|oran|sonelgaz)\b/i,
    query: 'Electricité mix moyen Algérie',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
    geographyHint: 'Algérie',
  },
  {
    pattern: /\b(solaire\w*|photovolta[iï]que\w*|\bpv\b|panneau\w*\s+solaire\w*)\b/i,
    query: 'Electricité photovoltaïque',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
  },
  {
    pattern: /\b([eé]olien\w*|turbine\w*)\b/i,
    query: 'Electricité éolien',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
  },
  {
    pattern: /\b([eé]lectricit[eé]\w*|kwh|mwh|[eé]nergie\w*|[eé]clairage\w*|presse\w*|carrousel\w*|moteur\w*|pompe\w*)\b/i,
    query: 'Electricité mix moyen kWh',
    stage: 'manufacturing',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
  },
  {
    pattern: /\b(gaz\s+naturel|chaudi[eè]re\w*|thermique\w*|cuisson|four\w*|calcination|vapeur)\b/i,
    query: 'Gaz naturel kWh PCI',
    stage: 'manufacturing',
    categoryHint: 'Combustibles',
    unitHint: 'kWh',
  },
  {
    pattern: /\b(diesel|gazole|fioul|fuel|groupe\s+[eé]lectrog[eè]ne|engin\w*|pelleteuse|tracteur)\b/i,
    query: 'Gazole routier',
    stage: 'manufacturing',
    categoryHint: 'Combustibles',
  },
  {
    pattern: /\b(biogaz|biom[eé]thane|m[eé]thanis\w*|digesteur\w*)\b/i,
    query: 'Biométhane biogaz',
    stage: 'manufacturing',
    categoryHint: 'Combustibles',
  },
  {
    pattern: /\b(serveur\w*|cloud|data\s*center|ia\b|num[eé]rique\w*|logiciel\w*|saas|plateforme\w*|edtech|informatique)\b/i,
    query: 'Informatique serveur équipements',
    stage: 'manufacturing',
    categoryHint: 'Informatique et équipements électroniques',
  },

  // --- Raw materials & inputs (raw_materials) ---
  {
    pattern: /\b(pehd|hdpe|poly[eé]thyl[eè]ne\s+haute)\b/i,
    query: 'Plastique PEHD',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(pebd|ldpe|film\s+plastique)\b/i,
    query: 'Plastique PEBD',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(pet\b|bouteille\w*\s+plastique|poly[eé]thyl[eè]ne\s+t[eé]r[eé]phtalate)\b/i,
    query: 'Plastique PET',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(pp\b|polypropyl[eè]ne)\b/i,
    query: 'PP polypropylène',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(pvc\b|polychlorure)\b/i,
    query: 'Plastique PVC',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(plastique\w*|polym[eè]re\w*|polyur[eé]thane|pu\b|tpu\b|r[eé]sine\w*|semelle\w*|injection|caoutchouc|polyol\w*)\b/i,
    query: 'Plastique moyenne',
    stage: 'raw_materials',
    categoryHint: 'Plastiques',
  },
  {
    pattern: /\b(acier\w*|fer\b|m[eé]tal|m[eé]taux|embout\s+acier|ch[aâ]ssis|usinage\w*)\b/i,
    query: 'Acier ou fer blanc',
    stage: 'raw_materials',
    categoryHint: 'Métaux',
  },
  {
    pattern: /\b(aluminium|alu\b)\b/i,
    query: 'Aluminium',
    stage: 'raw_materials',
    categoryHint: 'Métaux',
  },
  {
    pattern: /\b(cuivre|c[aâ]ble\w*|bobinage)\b/i,
    query: 'Cuivre',
    stage: 'raw_materials',
    categoryHint: 'Métaux',
  },
  {
    pattern: /\b(verre|flacon\s+verre|bocal|vitrage)\b/i,
    query: 'Verre',
    stage: 'raw_materials',
    categoryHint: 'Produits minéraux',
  },
  {
    pattern: /\b(ciment\w*|b[eé]ton\w*|gypse|pl[aâ]tre|clinker|brique\w*|chaux|carri[eè]re\w*|construction\w*)\b/i,
    query: 'Ciment béton plâtre',
    stage: 'raw_materials',
    categoryHint: 'Ciment, chaux, plâtre, béton',
  },
  {
    pattern: /\b(textile\w*|coton\w*|gaze|tissu\w*|cuir\w*|chaussure\w*|v[eê]tement\w*|lin\b|laine\b)\b/i,
    query: 'Coton textile',
    stage: 'raw_materials',
    categoryHint: 'Textile',
  },
  {
    pattern: /\b(bois\b|palette\w*|sciage|menuiserie|charpente)\b/i,
    query: 'Bois',
    stage: 'raw_materials',
    categoryHint: 'Bois',
  },
  {
    pattern: /\b(huile\s+d['’]olive|olive\w*|huilerie|grignon\w*|margine\w*|huile\s+v[eé]g[eé]tale)\b/i,
    query: 'Huile olive végétale',
    stage: 'raw_materials',
    categoryHint: 'Agro-alimentaire',
  },
  {
    pattern: /\b(engrais|azote\w*|phosphate|npk|ur[eé]e|pesticide\w*|phytosanitaire\w*|chimique\w*|solvant\w*)\b/i,
    query: 'Engrais azote chimie',
    stage: 'raw_materials',
    categoryHint: 'Produits chimiques',
  },
  {
    pattern: /\b(compost\w*|agriculture\w*|agro\w*|biomasse\w*|c[eé]r[eé]ale\w*|r[eé]colte\w*|mara[iî]ch\w*)\b/i,
    query: 'Compost engrais agriculture',
    stage: 'raw_materials',
    categoryHint: 'Agriculture',
  },
  {
    pattern: /\b(eau\w*|forage\w*|dessalement|effluent\w*|d[eé]pollution\w*|step\b|zld\b|hydrique\w*)\b/i,
    query: 'Traitement eaux usées',
    stage: 'raw_materials',
  },

  // --- Packaging (packaging) ---
  {
    pattern: /\b(carton\w*|papier\w*|kraft|bo[iî]te\w*|caisse\w*|emballage\w*|conditionnement\w*)\b/i,
    query: 'Carton',
    stage: 'packaging',
    categoryHint: 'Papier, carton',
  },
  {
    pattern: /\b(film\s+etirable|film\s+plastique|sachet\w*|emballage\s+plastique|blister|st[eé]rile)\b/i,
    query: 'Films plastiques PET',
    stage: 'packaging',
    categoryHint: 'Plastiques',
  },

  // --- Transport & Logistics (transport) ---
  {
    pattern: /\b(transport\w*|logistique\w*|livraison\w*|camion\w*|fret|routier\w*|exp[eé]dition\w*|circuit\s+court)\b/i,
    query: 'Articulé transport routier',
    stage: 'transport',
    categoryHint: 'Transport de marchandises > Routier',
    unitHint: 't.km',
  },
  {
    pattern: /\b(maritime\w*|port\w*|conteneur\w*|cargo|export\w*|import\w*)\b/i,
    query: 'Cargo maritime',
    stage: 'transport',
    categoryHint: 'Transport de marchandises > Maritime',
    unitHint: 't.km',
  },
  {
    pattern: /\b(ferroviaire\w*|train\w*|rail)\b/i,
    query: 'Train marchandises ferroviaire',
    stage: 'transport',
    categoryHint: 'Transport de marchandises',
    unitHint: 't.km',
  },

  // --- Usage (usage) ---
  {
    pattern: /\b(utilisation|maintenance|consommation\s+en\s+service|dur[eé]e\s+de\s+vie|utilisation\s+[eé]lectrique|recharge)\b/i,
    query: 'Electricité mix moyen kWh',
    stage: 'usage',
    categoryHint: 'Electricité',
    unitHint: 'kWh',
  },

  // --- End of Life & Waste Treatment (end_of_life) ---
  {
    pattern: /\b(fin\s+de\s+vie|d[eé]chet\w*|recyclage\w*|recycl[eé]\w*|broyage|reprise|enfouissement|d[eé]charge|incin[eé]ration|compostage|st[eé]rile|dangereux|dasri)\b/i,
    query: 'Déchets traitement recyclage enfouissement',
    stage: 'end_of_life',
    categoryHint: 'Traitement des déchets',
  },
];

function extractStageQueries(params: {
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  lifeCycleDetails?: string;
  fullDocumentContent?: string;
}): Array<{ query: string; stage: AcvStageCategory; categoryHint?: string; unitHint?: string; geographyHint?: string }> {
  const combined = [
    params.title || '',
    params.sector || '',
    params.location || '',
    params.description || '',
    params.lifeCycleDetails || '',
    (params.fullDocumentContent || '').slice(0, 25000),
  ].join(' ');

  const selected: Array<{
    query: string;
    stage: AcvStageCategory;
    categoryHint?: string;
    unitHint?: string;
    geographyHint?: string;
  }> = [];
  const seenKey = new Set<string>();

  for (const rule of STAGE_QUERY_RULES) {
    if (rule.pattern.test(combined)) {
      const key = `${rule.stage}::${rule.query}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        selected.push({
          query: rule.query,
          stage: rule.stage,
          categoryHint: rule.categoryHint,
          unitHint: rule.unitHint,
          geographyHint: rule.geographyHint,
        });
      }
    }
  }

  // Ensure coverage of every essential ACV stage so no stage is left without ADEME options
  const ensureStage = (
    stage: AcvStageCategory,
    fallback: { query: string; categoryHint?: string; unitHint?: string }
  ) => {
    if (!selected.some((item) => item.stage === stage)) {
      selected.push({ ...fallback, stage });
    }
  };

  ensureStage('raw_materials', { query: 'Plastique moyenne', categoryHint: 'Plastiques' });
  ensureStage('manufacturing', { query: 'Electricité mix moyen kWh', categoryHint: 'Electricité', unitHint: 'kWh' });
  ensureStage('packaging', { query: 'Carton', categoryHint: 'Papier, carton' });
  ensureStage('transport', {
    query: 'Articulé transport routier',
    categoryHint: 'Transport de marchandises > Routier',
    unitHint: 't.km',
  });
  ensureStage('end_of_life', {
    query: 'Déchets traitement',
    categoryHint: 'Traitement des déchets',
  });

  return selected.slice(0, 14);
}

export function extractBaseCarboneQueries(params: {
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  lifeCycleDetails?: string;
  fullDocumentContent?: string;
}): string[] {
  return extractStageQueries(params).map((item) => item.query);
}

/** Suggest pertinent ADEME factors for a given ACV stage and project context. */
export async function suggestBaseCarboneFactors(params: {
  stageCategory?: AcvStageCategory;
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  query?: string;
  size?: number;
}): Promise<AdemeReferenceFactor[]> {
  const size = Math.min(20, Math.max(1, params.size ?? 10));
  const targetStage = params.stageCategory;

  if (params.query && params.query.trim()) {
    const direct = await searchBaseCarbone(params.query.trim(), {
      size,
      stageCategory: targetStage,
      geographyHint: params.location,
    });
    return direct.map((f) => ({
      ...f,
      ...(targetStage ? { appliedStage: STAGE_LABEL_FR[targetStage] } : {}),
    }));
  }

  const stageRules = extractStageQueries({
    title: params.title,
    sector: params.sector,
    description: params.description,
    location: params.location,
  }).filter((r) => !targetStage || r.stage === targetStage);

  const effectiveRules =
    stageRules.length > 0
      ? stageRules
      : [
          {
            query:
              targetStage === 'transport'
                ? 'Articulé transport routier'
                : targetStage === 'end_of_life'
                ? 'Déchets traitement'
                : targetStage === 'packaging'
                ? 'Carton'
                : targetStage === 'manufacturing'
                ? 'Electricité mix moyen kWh'
                : 'Plastique moyenne',
            stage: targetStage || ('raw_materials' as AcvStageCategory),
          },
        ];

  const batches = await Promise.all(
    effectiveRules.slice(0, 4).map((rule) =>
      searchBaseCarbone(rule.query, {
        size: 4,
        categoryHint: rule.categoryHint,
        unitHint: rule.unitHint,
        stageCategory: rule.stage,
        geographyHint: rule.geographyHint || params.location,
      })
    )
  );

  const deduped: AdemeReferenceFactor[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const item of batch) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push({
          ...item,
          ...(targetStage ? { appliedStage: STAGE_LABEL_FR[targetStage] } : {}),
        });
      }
    }
  }
  return deduped.slice(0, size);
}

export async function fetchContextualBaseCarboneFactors(params: {
  title?: string;
  sector?: string;
  description?: string;
  location?: string;
  lifeCycleDetails?: string;
  fullDocumentContent?: string;
  timeoutMs?: number;
}): Promise<{ factors: AdemeReferenceFactor[]; promptBlock: string }> {
  const stageQueries = extractStageQueries(params);
  const timeoutMs = params.timeoutMs ?? 4500;

  try {
    const batches = await Promise.all(
      stageQueries.map(async (rule) => {
        const items = await searchBaseCarbone(rule.query, {
          size: 3,
          timeoutMs,
          categoryHint: rule.categoryHint,
          unitHint: rule.unitHint,
          stageCategory: rule.stage,
          geographyHint: rule.geographyHint || params.location,
        });
        return { stage: rule.stage, items };
      })
    );

    const byStage = new Map<AcvStageCategory, AdemeReferenceFactor[]>();
    const deduped: AdemeReferenceFactor[] = [];
    const seen = new Set<string>();

    for (const { stage, items } of batches) {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        const enriched: AdemeReferenceFactor = {
          ...item,
          appliedStage: STAGE_LABEL_FR[stage],
        };
        deduped.push(enriched);
        const list = byStage.get(stage) || [];
        if (list.length < 5) {
          list.push(enriched);
          byStage.set(stage, list);
        }
      }
    }

    const topFactors = deduped.slice(0, 24);
    if (topFactors.length === 0) {
      return { factors: [], promptBlock: '' };
    }

    const stageOrder: AcvStageCategory[] = [
      'raw_materials',
      'manufacturing',
      'packaging',
      'transport',
      'usage',
      'end_of_life',
    ];

    const groupedSections: string[] = [];
    for (const st of stageOrder) {
      const stageItems = byStage.get(st);
      if (!stageItems || stageItems.length === 0) continue;
      const lines = stageItems.map((f) => {
        const label = f.attribute ? `${f.name} (${f.attribute})` : f.name;
        const inc = f.uncertaintyPct ? ` | incertitude ±${f.uncertaintyPct}%` : '';
        const prov = f.program ? ` | programme: ${f.program}` : '';
        return `  - [ADEME ID #${f.id}] ${label} = ${f.factorKgCO2e} ${f.unit} | catégorie: ${f.category} | localisation: ${f.geography}${inc}${prov}`;
      });
      groupedSections.push(`### ${STAGE_LABEL_FR[st]}\n${lines.join('\n')}`);
    }

    const promptBlock = `
RÉFÉRENTIEL OFFICIEL ADEME BASE EMPREINTE® / BASE CARBONE® — VERSION ${BASE_CARBONE_VERSION} (index local figé, source de vérité unique et reproductible ; SHA256 ${BASE_CARBONE_SOURCE_SHA256.slice(0, 16)}…) :
${groupedSections.join('\n\n')}

MÉTHODOLOGIE EXPERTE DE CALCUL PAR FACTEURS ADEME (QUANTITÉ × FACTEUR) — OBLIGATOIRE :
1. ANCRAGE SUR L'ÉTUDE TECHNIQUE ET L'ACV :
   - Sélectionne des Postes / Intrants (factorApplications) qui reflètent FIDÈLEMENT les matières, énergies, procédés, emballages, flux logistiques et filières de fin de vie issus de l'étude technique et des documents fournis.
   - Chaque étape ACV (raw_materials, manufacturing, packaging, transport, usage, end_of_life) doit comporter 1 à 4 postes pertinents et distincts lorsque l'étape est active pour le projet.
2. COHÉRENCE STRICTE AVEC L'UNITÉ FONCTIONNELLE (fu1, scaleFactor = 1) ET CONVERSION D'UNITÉS :
   - Exprime CHAQUE \`quantity\` POUR 1 unité fonctionnelle \`fu1\` et DANS L'UNITÉ DU FACTEUR ADEME RETENU (ex. : si le facteur ADEME est en \`kgCO2e/tonne\` et que l'étude technique indique 420 g de matière par UF + 5 % de perte procédé, alors \`quantity = 0.000441\` tonne ; si le facteur est en \`kgCO2e/t.km\` pour 0,5 kg transportés sur 300 km, alors \`quantity = 0.0005 × 300 = 0.15\` t.km ; si le facteur est en \`kgCO2e/kWh\`, \`quantity\` est en kWh/UF).
   - Documente explicitement ce calcul et les données techniques dans \`posteLabel\` (intitulé métier du poste), \`technicalJustification\` (dérivation chiffrée pour \`fu1\` avec pertes/rendements), \`sourceBasis\` ("Étude technique / Document", "Bilan matière ACV" ou "Hypothèse experte ACV") et \`iso14064Category\` ("Catégorie 1" à "Catégorie 5").
3. TRAÇABILITÉ ADEME V23.11 & ZÉRO HALLUCINATION :
   - Utilise UNIQUEMENT les identifiants [ADEME ID #xxxxx] et les valeurs/unités exactes ci-dessus (sans inventer de facteur ni modifier son unité).
   - \`emissionKgCO2e = quantity × factorKgCO2e\`. L'émission de chaque étape est la somme exacte de ses \`factorApplications\`, et \`totalCarbonKgCO2e\` est la somme exacte des 6 étapes.
   - Cite explicitement les IDs ADEME retenus dans les descriptions d'étapes, dans \`benchmarkComparison.commentary\` et dans \`ademeReferenceFactors\`.`;

    return { factors: topFactors, promptBlock };
  } catch {
    return { factors: [], promptBlock: '' };
  }
}
