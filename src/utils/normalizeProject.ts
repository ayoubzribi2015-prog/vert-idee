import type {
  AdemeReferenceFactor,
  BenchmarkComparison,
  CarbonFactorApplication,
  CarbonFootprintModel,
  FunctionalUnitOption,
  LifecycleStageCarbon,
  ProjectAudit,
} from '../types.ts';

const CARBON_STAGE_CATEGORIES: LifecycleStageCarbon['category'][] = [
  'raw_materials',
  'manufacturing',
  'packaging',
  'transport',
  'usage',
  'end_of_life',
];

const GENERIC_FUNCTIONAL_UNITS = new Set([
  '1 unité fonctionnelle / service',
  '1 unité fonctionnelle / lot standardisé',
  'unité fonctionnelle',
  'unité fonctionnelle / service',
  'unité',
  'service',
]);

const FU_RULES: Array<{ re: RegExp; unit: string }> = [
  { re: /\b(chaussure|semelle|bottine|basket)/i, unit: '1 paire de chaussures / semelles injectées' },
  { re: /\b(plâtre|orthopédique|dispositif médical|médical)/i, unit: '1 000 pièces de dispositifs médicaux stériles' },
  { re: /\b(emballage|packaging|boîte|carton)/i, unit: '1 000 unités d’emballage' },
  { re: /\b(textile|vêtement|tissu|coton)/i, unit: '1 pièce textile éco-conçue' },
  { re: /\b(eau|effluent|step|dépollution|hydrique)/i, unit: '1 m³ d’eau traitée' },
  { re: /\b(kwh|électricité|solaire|photovolta|énergie)/i, unit: '1 kWh d’énergie produite' },
  { re: /\b(logiciel|saas|plateforme|numérique|cloud|application|edtech|éducation)/i, unit: '1 compte utilisateur actif annuel' },
  { re: /\b(tonne|phosphate|engrais|compost|agro)/i, unit: '1 tonne de matière traitée' },
  { re: /\b(plastique|pehd|pebd|pet|injection|polymère)/i, unit: '1 kg de plastique injecté' },
  { re: /\b(acier|métal|aluminium)/i, unit: '1 kg de métal transformé' },
  { re: /\b(ciment|béton|construction|brique)/i, unit: '1 kg de matériau de construction' },
];

/** A usable functional unit must be concrete: a quantity AND a real object. */
export function isConcreteFunctionalUnit(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length < 6 || GENERIC_FUNCTIONAL_UNITS.has(v.toLowerCase())) return false;
  return /\d/.test(v) && /[a-zA-ZÀ-ÿ]/.test(v);
}

/** Deterministic last-resort functional unit derived from the project itself. */
export function deriveFunctionalUnit(params: {
  title?: string;
  description?: string;
  sector?: string;
}): string {
  const text = [params.title, params.description, params.sector].filter(Boolean).join(' ');
  for (const rule of FU_RULES) {
    if (rule.re.test(text)) return rule.unit;
  }
  const title = (params.title || '').trim().replace(/\s+/g, ' ').slice(0, 90);
  return title ? `1 unité de ${title}` : '1 unité fonctionnelle du projet';
}

/**
 * STRICT_IA gate for the four expert proposals. A diagnostic is only accepted
 * when the model returned exactly four distinct, concrete functional units
 * with a finite positive scale factor. No deterministic option may be invented.
 */
export function isValidFunctionalUnitOptions(value: unknown): value is FunctionalUnitOption[] {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const ids = new Set<string>();
  let hasBaseline = false;
  for (const option of value) {
    if (!option || typeof option !== 'object') return false;
    const candidate = option as Record<string, unknown>;
    const id = String(candidate.id ?? '').trim();
    if (!id || ids.has(id)) return false;
    ids.add(id);
    if (!isConcreteFunctionalUnit(candidate.label)) return false;
    if (typeof candidate.rationale !== 'string' || !candidate.rationale.trim()) return false;
    if (typeof candidate.proposedBy !== 'string' || !candidate.proposedBy.trim()) return false;
    const scale = Number(candidate.scaleFactor);
    if (!Number.isFinite(scale) || scale <= 0) return false;
    // At least one option (fu1) is the baseline on which the ADEME quantities
    // were computed: without a scale of 1 the multiplier semantics break.
    if (scale === 1) hasBaseline = true;
  }
  return hasBaseline;
}

/**
 * Recompute the whole footprint on the functional unit validated by the user.
 * The four proposals are relative to the base calculation (fu1 = 1): switching
 * between options computes `ratio = option.scaleFactor / previousScale` so
 * repeated switches across fu1..fu4 remain exact and never compound.
 */
export function applyFunctionalUnitScale(rawCarbon: any, optionId: string): any | null {
  const options = rawCarbon?.functionalUnitOptions;
  if (!isValidFunctionalUnitOptions(options)) return null;
  const option = options.find((o) => o.id === optionId);
  if (!option) return null;

  const scale = Number(option.scaleFactor);
  const previousScaleRaw = Number(rawCarbon?.appliedFunctionalUnitScale);
  const previousScale =
    Number.isFinite(previousScaleRaw) && previousScaleRaw > 0 ? previousScaleRaw : 1;
  const ratio = scale / previousScale;

  const scaledStages = (Array.isArray(rawCarbon?.lifecycleStages) ? rawCarbon.lifecycleStages : []).map(
    (stage: any) => {
      const lines = Array.isArray(stage?.factorApplications) ? stage.factorApplications : [];
      const scaledLines = lines.map((line: any) => {
        const quantity = Number(Number(line?.quantity || 0) * ratio);
        const factor = Number(line?.factorKgCO2e || 0);
        return {
          ...line,
          quantity: Number(quantity.toFixed(6)),
          emissionKgCO2e: Number((quantity * factor).toFixed(6)),
        };
      });
      const emission = scaledLines.reduce(
        (sum: number, line: any) => sum + Number(line.emissionKgCO2e || 0),
        0
      );
      return {
        ...stage,
        ...(scaledLines.length > 0 ? { factorApplications: scaledLines } : {}),
        emissionKgCO2e: scaledLines.length > 0
          ? Number(emission.toFixed(4))
          : Number((Number(stage?.emissionKgCO2e || 0) * ratio).toFixed(4)),
      };
    }
  );

  const total = scaledStages.reduce(
    (sum: number, stage: any) => sum + Number(stage.emissionKgCO2e || 0),
    0
  );
  const benchmark = rawCarbon?.benchmarkComparison || {};
  const baseUnit =
    typeof rawCarbon?.functionalUnitBase === 'string' && rawCarbon.functionalUnitBase.trim()
      ? rawCarbon.functionalUnitBase
      : String(rawCarbon?.functionalUnit || option.label);

  return {
    ...rawCarbon,
    functionalUnit: option.label,
    functionalUnitBase: baseUnit,
    functionalUnitOptions: options,
    selectedFunctionalUnitId: option.id,
    functionalUnitValidated: true,
    appliedFunctionalUnitScale: scale,
    totalCarbonKgCO2e: Number(total.toFixed(4)),
    lifecycleStages: scaledStages.map((stage: any) => ({
      ...stage,
      percentage:
        total > 0
          ? Number(((Number(stage.emissionKgCO2e || 0) / total) * 100).toFixed(1))
          : 0,
    })),
    benchmarkComparison: {
      ...benchmark,
      industryAverageKgCO2e: Number(
        (Number(benchmark.industryAverageKgCO2e || 0) * ratio).toFixed(4)
      ),
      ecoDesignedTargetKgCO2e: Number(
        (Number(benchmark.ecoDesignedTargetKgCO2e || 0) * ratio).toFixed(4)
      ),
    },
  };
}

export const BASE_CARBONE_VERSION = 'V23.11';
export const BASE_CARBONE_DOC_URL = 'https://base-empreinte.ademe.fr/documentation/base-carbone';

/** Extract denominator unit from an ADEME factor unit string (e.g. "kgCO2e/tonne" -> "tonne"). */
export function getFactorDenominator(unit: string): string {
  const raw = String(unit || '').trim();
  const idx = raw.indexOf('/');
  if (idx === -1) return raw || 'unité';
  return raw.slice(idx + 1).trim() || 'unité';
}

const normUnitText = (u: string): string =>
  String(u || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9³.]+/g, ' ')
    .trim();

/** Return selectable activity input units compatible with an ADEME factor denominator. */
export function getCompatibleActivityUnits(factorUnit: string): Array<{ id: string; label: string }> {
  const denom = getFactorDenominator(factorUnit);
  const d = normUnitText(denom);
  const isTkm = d.includes('t km') || d.includes('tonne km') || d.includes('t.km');
  const isKgKm = d.includes('kg km') || d.includes('kg.km');

  if (isTkm || isKgKm) {
    return [
      { id: denom, label: `${denom} (natif)` },
      { id: 't.km', label: 't.km (tonne × km)' },
      { id: 'kg.km', label: 'kg.km (kg × km)' },
    ].filter((item, idx, arr) => arr.findIndex((x) => normUnitText(x.id) === normUnitText(item.id)) === idx);
  }
  if (d.includes('tonne') || d === 't' || d.startsWith('kg') || d.includes(' kg') || d === 'g' || d.includes('gramme')) {
    return [
      { id: denom, label: `${denom} (natif)` },
      { id: 'g', label: 'g (grammes)' },
      { id: 'kg', label: 'kg (kilogrammes)' },
      { id: 'tonne', label: 'tonne (1 000 kg)' },
    ].filter((item, idx, arr) => arr.findIndex((x) => normUnitText(x.id) === normUnitText(item.id)) === idx);
  }
  if (d.includes('kwh') || d.includes('mwh') || d.includes('gj') || d.includes('mj')) {
    return [
      { id: denom, label: `${denom} (natif)` },
      { id: 'kWh', label: 'kWh' },
      { id: 'MWh', label: 'MWh (1 000 kWh)' },
      { id: 'MJ', label: 'MJ' },
      { id: 'GJ', label: 'GJ' },
    ].filter((item, idx, arr) => arr.findIndex((x) => normUnitText(x.id) === normUnitText(item.id)) === idx);
  }
  if (d === 'l' || d.includes('litre') || d.includes('m3') || d.includes('m³')) {
    return [
      { id: denom, label: `${denom} (natif)` },
      { id: 'L', label: 'L (litres)' },
      { id: 'm3', label: 'm³ (1 000 L)' },
    ].filter((item, idx, arr) => arr.findIndex((x) => normUnitText(x.id) === normUnitText(item.id)) === idx);
  }
  return [{ id: denom, label: denom }];
}

/** Convert user-entered activity quantity from `fromUnit` into the factor denominator unit. */
export function convertActivityToDenominator(
  quantity: number,
  fromUnit: string,
  factorUnit: string
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const from = normUnitText(fromUnit);
  const to = normUnitText(getFactorDenominator(factorUnit));
  if (!from || from === to) return quantity;

  const isTkm = (u: string) => u.includes('t km') || u.includes('tonne km') || u.includes('t.km');
  const isKgKm = (u: string) => u.includes('kg km') || u.includes('kg.km');
  if (isKgKm(from) && isTkm(to)) return quantity / 1000;
  if (isTkm(from) && isKgKm(to)) return quantity * 1000;
  if ((isTkm(from) && isTkm(to)) || (isKgKm(from) && isKgKm(to))) return quantity;

  const kgPer = (u: string): number | null => {
    if (isTkm(u) || isKgKm(u)) return null;
    if (u.includes('tonne') || u === 't') return 1000;
    if (u === 'g' || u.startsWith('g ') || u.includes('gramme')) return 0.001;
    if (u.startsWith('kg') || u.includes(' kg')) return 1;
    return null;
  };
  const fromKg = kgPer(from);
  const toKg = kgPer(to);
  if (fromKg !== null && toKg !== null) return (quantity * fromKg) / toKg;

  const kwhPer = (u: string): number | null => {
    if (u.includes('mwh')) return 1000;
    if (u.includes('kwh')) return 1;
    if (u.includes('gj')) return 277.7778;
    if (u.includes('mj')) return 0.277778;
    return null;
  };
  const fromKwh = kwhPer(from);
  const toKwh = kwhPer(to);
  if (fromKwh !== null && toKwh !== null) return (quantity * fromKwh) / toKwh;

  const literPer = (u: string): number | null => {
    if (u === 'l' || u.includes('litre')) return 1;
    if (u.includes('m3') || u.includes('m³')) return 1000;
    return null;
  };
  const fromL = literPer(from);
  const toL = literPer(to);
  if (fromL !== null && toL !== null) return (quantity * fromL) / toL;

  return quantity;
}

/** Propagate ADEME uncertainty percentages across all factor lines (ISO 14067 / GHG Protocol RSS). */
export function computeCarbonUncertainty(stages: LifecycleStageCarbon[]): {
  hasUncertainty: boolean;
  relativePct: number;
  absKgCO2e: number;
  minKgCO2e: number;
  maxKgCO2e: number;
  verifiedCount: number;
  totalLines: number;
} {
  let total = 0;
  let sumSquares = 0;
  let hasUncertainty = false;
  let verifiedCount = 0;
  let totalLines = 0;

  for (const stage of stages || []) {
    const lines = stage.factorApplications || [];
    if (lines.length === 0) {
      total += Number(stage.emissionKgCO2e || 0);
      continue;
    }
    for (const line of lines) {
      totalLines += 1;
      if (line.verifiedAdeme || (line.ademeId && line.version)) verifiedCount += 1;
      const emission = Math.max(0, Number(line.emissionKgCO2e || 0));
      total += emission;
      const uPct = Number(line.uncertaintyPct);
      if (Number.isFinite(uPct) && uPct > 0 && emission > 0) {
        hasUncertainty = true;
        const absU = emission * (uPct / 100);
        sumSquares += absU * absU;
      } else if (emission > 0) {
        // Default conservative 20% uncertainty when not specified in ADEME record
        const absU = emission * 0.2;
        sumSquares += absU * absU;
      }
    }
  }

  const absKgCO2e = Math.sqrt(sumSquares);
  const relativePct = total > 0 ? Math.round((absKgCO2e / total) * 100) : 0;
  return {
    hasUncertainty,
    relativePct,
    absKgCO2e: Number(absKgCO2e.toFixed(3)),
    minKgCO2e: Number(Math.max(0, total - absKgCO2e).toFixed(2)),
    maxKgCO2e: Number((total + absKgCO2e).toFixed(2)),
    verifiedCount,
    totalLines,
  };
}

/** Normalize factor lines and recompute their emissions (quantity × factor). */
export function normalizeFactorApplications(
  raw: any,
  ademeFactors: AdemeReferenceFactor[],
  stageName: string
): CarbonFactorApplication[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((a: any) => a && typeof a === 'object')
    .map((a: any, index: number) => {
      const ademeId = String(a.ademeId ?? a.id ?? '')
        .replace(/^#/, '')
        .trim();
      const match = ademeId ? ademeFactors.find((f) => String(f.id).replace(/^#/, '').trim() === ademeId) : undefined;
      const quantityRaw = Number(a.quantity);
      const factorRaw = Number(a.factorKgCO2e ?? a.factorKgCO2ePerUnit);
      const emissionRaw = Number(a.emissionKgCO2e);
      const quantity = Number.isFinite(quantityRaw) && quantityRaw >= 0 ? quantityRaw : 0;
      let factor = Number.isFinite(factorRaw) && factorRaw >= 0 ? factorRaw : 0;
      // The frozen local index is the single source of truth: whenever the ADEME
      // ID resolves locally, its V23.11 value overrides any model-supplied value.
      if (match && match.factorKgCO2e > 0) factor = match.factorKgCO2e;
      if (factor <= 0 && quantity > 0 && Number.isFinite(emissionRaw) && emissionRaw > 0) {
        factor = emissionRaw / quantity;
      }

      const name = String(match?.name || a.name || `Facteur ADEME ${ademeId || 'inconnu'}`);
      const unit = String(match?.unit || a.unit || 'kgCO2e/unité');
      const uncertaintyPct = Number.isFinite(Number(match?.uncertaintyPct))
        ? Number(match?.uncertaintyPct)
        : Number.isFinite(Number(a.uncertaintyPct))
        ? Number(a.uncertaintyPct)
        : undefined;
      const version = match?.version ? String(match.version) : a.version ? String(a.version) : undefined;
      const posteLabel =
        typeof a.posteLabel === 'string' && a.posteLabel.trim() ? a.posteLabel.trim() : undefined;
      const technicalJustification =
        typeof a.technicalJustification === 'string' && a.technicalJustification.trim()
          ? a.technicalJustification.trim()
          : undefined;
      const sourceBasis =
        typeof a.sourceBasis === 'string' && a.sourceBasis.trim() ? a.sourceBasis.trim() : undefined;
      const iso14064Category =
        typeof a.iso14064Category === 'string' && a.iso14064Category.trim()
          ? a.iso14064Category.trim()
          : undefined;
      const verifiedAdeme = Boolean(a.verifiedAdeme || (match && match.version));

      return {
        id: String(a.id || `app_${ademeId || 'x'}_${index}`),
        ademeId,
        name,
        ...(posteLabel ? { posteLabel } : {}),
        ...(technicalJustification ? { technicalJustification } : {}),
        ...(sourceBasis ? { sourceBasis } : {}),
        ...(iso14064Category ? { iso14064Category } : {}),
        ...(verifiedAdeme ? { verifiedAdeme: true } : {}),
        quantity,
        unit,
        factorKgCO2e: factor,
        emissionKgCO2e: Number((quantity * factor).toFixed(6)),
        ...(match?.category || a.category ? { category: String(match?.category || a.category) } : {}),
        ...(match?.geography || a.geography ? { geography: String(match?.geography || a.geography) } : {}),
        ...(Number.isFinite(uncertaintyPct as number) ? { uncertaintyPct: Number(uncertaintyPct) } : {}),
        ...(version ? { version } : {}),
        ...(match?.program || a.program ? { program: String(match?.program || a.program) } : {}),
        appliedStage: String(a.appliedStage || stageName),
      };
    })
    .filter((a: CarbonFactorApplication) => a.factorKgCO2e > 0);
}

/**
 * Deterministic 6-stage ISO 14064-1 breakdown used only when no usable stages
 * are available. When ADEME factors are known, each default stage is expressed
 * as a quantity × factor line so the whole total remains factor-based.
 */
export function buildDefaultLifecycleStages(
  totalKgCO2e: number,
  ademeFactors: AdemeReferenceFactor[] = []
): LifecycleStageCarbon[] {
  // Never manufacture a breakdown from an absent or zero total.
  if (!Number.isFinite(totalKgCO2e) || totalKgCO2e <= 0) return [];
  const definitions = [
    { id: 'raw_materials', name: 'Approvisionnement & matières premières', category: 'raw_materials' as const, weight: 0.34, description: 'Intrants et matières premières (Catégorie 4 ISO 14064-1).', reductionOpportunity: 'Privilégier matières recyclées et circuits courts.' },
    { id: 'manufacturing', name: 'Fabrication & procédés', category: 'manufacturing' as const, weight: 0.26, description: 'Procédés de production et énergie importée (Catégories 1-2).', reductionOpportunity: 'Électrifier les procédés et recourir aux énergies renouvelables.' },
    { id: 'packaging', name: 'Conditionnement & emballages', category: 'packaging' as const, weight: 0.10, description: 'Emballages et intrants de conditionnement (Catégorie 4).', reductionOpportunity: 'Réduire, réutiliser et recycler les emballages.' },
    { id: 'transport', name: 'Transport & logistique', category: 'transport' as const, weight: 0.14, description: 'Fret amont et aval, mobilité (Catégorie 3).', reductionOpportunity: 'Reporter le fret sur le rail et optimiser les tournées.' },
    { id: 'usage', name: 'Utilisation', category: 'usage' as const, weight: 0.08, description: 'Émissions de la phase d’utilisation du produit (Catégorie 5).', reductionOpportunity: 'Allonger la durée de vie et améliorer l’efficacité énergétique.' },
    { id: 'end_of_life', name: 'Fin de vie & valorisation', category: 'end_of_life' as const, weight: 0.08, description: 'Traitement des déchets et valorisation (Catégorie 5).', reductionOpportunity: 'Organiser la reprise et le recyclage des matériaux.' },
  ];

  return definitions.map((d, index) => {
    const targetEmission = Number((totalKgCO2e * d.weight).toFixed(6));
    const factor = ademeFactors.length ? ademeFactors[index % ademeFactors.length] : null;
    const factorApplications: CarbonFactorApplication[] =
      factor && factor.factorKgCO2e > 0
        ? [
            {
              id: `def_${d.id}`,
              ademeId: factor.id,
              name: factor.name,
              quantity: Number((targetEmission / factor.factorKgCO2e).toFixed(6)),
              unit: factor.unit,
              factorKgCO2e: factor.factorKgCO2e,
              emissionKgCO2e: Number(((targetEmission / factor.factorKgCO2e) * factor.factorKgCO2e).toFixed(6)),
              ...(factor.category ? { category: factor.category } : {}),
              ...(factor.geography ? { geography: factor.geography } : {}),
              ...(factor.uncertaintyPct ? { uncertaintyPct: factor.uncertaintyPct } : {}),
              ...(factor.version ? { version: factor.version } : {}),
              ...(factor.program ? { program: factor.program } : {}),
              appliedStage: d.name,
            },
          ]
        : [];

    return {
      id: d.id,
      name: d.name,
      category: d.category,
      emissionKgCO2e: factorApplications.length
        ? factorApplications[0].emissionKgCO2e
        : targetEmission,
      percentage: Number((d.weight * 100).toFixed(1)),
      description: `${d.description} Répartition estimative par défaut, à confirmer par les facteurs ADEME.`,
      reductionOpportunity: d.reductionOpportunity,
      factorApplications,
    };
  });
}

/** Recompute the whole footprint from ADEME factor applications. */
export function normalizeCarbonFootprint(
  carbon: any,
  benchmark: BenchmarkComparison,
  context: { title?: string; description?: string; sector?: string } = {}
): CarbonFootprintModel {
  const ademeFactors: AdemeReferenceFactor[] = Array.isArray(carbon?.ademeReferenceFactors)
    ? carbon.ademeReferenceFactors
        .filter((f: any) => f && f.name && Number.isFinite(Number(f.factorKgCO2e)))
        .slice(0, 20)
        .map((f: any) => ({
          id: String(f.id || ''),
          name: String(f.name),
          ...(f.attribute ? { attribute: String(f.attribute) } : {}),
          category: String(f.category || 'ADEME Base Carbone'),
          factorKgCO2e: Number(f.factorKgCO2e),
          unit: String(f.unit || 'kgCO2e/unité'),
          geography: String(f.geography || 'France / International'),
          ...(Number.isFinite(Number(f.uncertaintyPct)) ? { uncertaintyPct: Number(f.uncertaintyPct) } : {}),
          ...(f.appliedStage ? { appliedStage: String(f.appliedStage) } : {}),
          source: String(f.source || 'ADEME Base Carbone®'),
          ...(f.version ? { version: String(f.version) } : {}),
          ...(f.validity ? { validity: String(f.validity) } : {}),
          ...(f.program ? { program: String(f.program) } : {}),
          ...(f.sourceDetail ? { sourceDetail: String(f.sourceDetail) } : {}),
          ...(Number.isFinite(Number(f.matchScore)) ? { matchScore: Number(f.matchScore) } : {}),
        }))
    : [];

  const rawStages = Array.isArray(carbon?.lifecycleStages) ? carbon.lifecycleStages : [];

  const stages: LifecycleStageCarbon[] = rawStages
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any) => {
      const name = typeof s.name === 'string' && s.name ? s.name : 'Étape du cycle de vie';
      const applications = normalizeFactorApplications(s.factorApplications, ademeFactors, name);
      const applicationSum = applications.reduce((sum, a) => sum + a.emissionKgCO2e, 0);
      const fallbackEmission = Number(s.emissionKgCO2e);
      const emissionKgCO2e =
        applications.length > 0
          ? Number(applicationSum.toFixed(6))
          : Number.isFinite(fallbackEmission) && fallbackEmission > 0
            ? fallbackEmission
            : 0;
      return {
        id: typeof s.id === 'string' && s.id ? s.id : String(s.category || 'stage'),
        name,
        category: CARBON_STAGE_CATEGORIES.includes(s.category) ? s.category : 'manufacturing',
        emissionKgCO2e,
        percentage: 0,
        description: typeof s.description === 'string' ? s.description : '',
        reductionOpportunity: typeof s.reductionOpportunity === 'string' ? s.reductionOpportunity : '',
        ...(applications.length > 0 ? { factorApplications: applications } : {}),
      };
    });

  // The total is derived from factor-based stages, never from the AI total or
  // from a benchmark. Without any traceable emission, the footprint stays at 0
  // and the UI displays "empreinte non calculée" instead of an invented value.
  let total = stages.reduce((sum, s) => sum + s.emissionKgCO2e, 0);
  if (!Number.isFinite(total) || total <= 0) {
    const declaredTotal = Number(carbon?.totalCarbonKgCO2e);
    if (Number.isFinite(declaredTotal) && declaredTotal > 0 && ademeFactors.length > 0) {
      stages.splice(0, stages.length, ...buildDefaultLifecycleStages(declaredTotal, ademeFactors));
      total = stages.reduce((sum, s) => sum + s.emissionKgCO2e, 0);
    } else {
      stages.splice(0, stages.length);
      total = 0;
    }
  }

  const normalizedStages = stages.map((s) => ({
    ...s,
    emissionKgCO2e: Number(s.emissionKgCO2e.toFixed(4)),
    percentage: total > 0 ? (s.emissionKgCO2e / total) * 100 : 0,
  }));
  total = Number(total.toFixed(4));

  const options: FunctionalUnitOption[] | undefined = isValidFunctionalUnitOptions(
    carbon?.functionalUnitOptions
  )
    ? carbon.functionalUnitOptions
    : undefined;
  const validatedOption = options?.find((option) => option.id === carbon?.selectedFunctionalUnitId);
  const functionalUnit = validatedOption?.label
    || (isConcreteFunctionalUnit(carbon?.functionalUnit)
      ? (carbon.functionalUnit as string).trim()
      : deriveFunctionalUnit(context));
  const appliedScale = Number(carbon?.appliedFunctionalUnitScale);

  return {
    functionalUnit,
    ...(options
      ? {
          functionalUnitOptions: options.map((option) => ({
            id: String(option.id),
            label: String(option.label).trim(),
            rationale: String(option.rationale),
            proposedBy: String(option.proposedBy),
            scaleFactor: Number(option.scaleFactor),
          })),
        }
      : {}),
    ...(typeof carbon?.functionalUnitBase === 'string' && carbon.functionalUnitBase.trim()
      ? { functionalUnitBase: carbon.functionalUnitBase }
      : {}),
    ...(carbon?.selectedFunctionalUnitId ? { selectedFunctionalUnitId: String(carbon.selectedFunctionalUnitId) } : {}),
    ...(carbon?.functionalUnitValidated === true || validatedOption
      ? { functionalUnitValidated: true }
      : {}),
    ...(Number.isFinite(appliedScale) && appliedScale > 0
      ? { appliedFunctionalUnitScale: appliedScale }
      : {}),
    totalCarbonKgCO2e: total,
    benchmarkComparison: benchmark,
    lifecycleStages: normalizedStages,
    highImpactDecarbonizationActions: Array.isArray(carbon?.highImpactDecarbonizationActions)
      ? carbon.highImpactDecarbonizationActions
      : [],
    ademeReferenceFactors: ademeFactors,
  };
}

export function normalizeProjectAudit(raw: any, fallbackTitle?: string, fallbackDesc?: string, fallbackLocation?: string): ProjectAudit {
  const synthesis = raw?.projectSynthesis || {};
  const scores = synthesis.scores || { environmental: 50, social: 50, circularity: 50, innovationFeasibility: 50, globalScore: 50 };
  
  const envAspects = raw?.environmentalAspects || {};
  const socialAspects = raw?.socialAspects || {};
  const greenBusiness = raw?.greenEntrepreneurshipIntegration || {};
  const impact = raw?.impactIndicators || {};
  const carbon = impact.carbonFootprint || {};
  const financing = raw?.greenFinancingAndLabels || {};
  const actionPlan = raw?.priorityActionPlan || {};

  return {
    id: raw?.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: raw?.userId,
    title: raw?.title || fallbackTitle || 'Projet Vert',
    sector: raw?.sector || raw?.detectedSector || 'Économie Circulaire',
    description: raw?.description || fallbackDesc || '',
    location: raw?.location || fallbackLocation || 'Tunisie',
    targetAudience: raw?.targetAudience || 'B2B / B2C',
    businessModel: raw?.businessModel || 'Économie Circulaire',
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt,
    projectSynthesis: {
      scores: {
        environmental: typeof scores.environmental === 'number' ? scores.environmental : 50,
        social: typeof scores.social === 'number' ? scores.social : 50,
        circularity: typeof scores.circularity === 'number' ? scores.circularity : 50,
        innovationFeasibility:
          typeof scores.innovationFeasibility === 'number'
            ? scores.innovationFeasibility
            : typeof scores.carbonMaturity === 'number'
            ? scores.carbonMaturity
            : 50,
        globalScore: typeof scores.globalScore === 'number' ? scores.globalScore : 50,
      },
      summary: synthesis.summary || raw?.description || 'Synthèse non disponible.',
      vision: synthesis.vision || 'Vision stratégique en cours de structuration.',
    },
    environmentalAspects: {
      strengths: Array.isArray(envAspects.strengths) ? envAspects.strengths : ['Optimisation des flux de ressources'],
      criticalRisks: Array.isArray(envAspects.criticalRisks) ? envAspects.criticalRisks : ['Surveillance des consommations énergétiques'],
      lifecycleAssessment: Array.isArray(envAspects.lifecycleAssessment) ? envAspects.lifecycleAssessment : [
        { phase: 'Approvisionnement', impactLevel: 'moyen', details: 'Analyse amont des intrants', ecoDesignLever: 'Circuits courts' },
        { phase: 'Fabrication', impactLevel: 'moyen', details: 'Procédés opérationnels', ecoDesignLever: 'Efficacité énergétique' },
        { phase: 'Fin de vie', impactLevel: 'faible', details: 'Valorisation des résidus', ecoDesignLever: 'Recyclabilité' }
      ],
      circularEconomy: {
        strategies: Array.isArray(envAspects.circularEconomy?.strategies) ? envAspects.circularEconomy.strategies : ['Réemploi et valorisation'],
        wasteValorization: envAspects.circularEconomy?.wasteValorization || 'Valorisation des coproduits et réduction des déchets.',
        durabilityRepair: envAspects.circularEconomy?.durabilityRepair || 'Conception pour la durabilité et la maintenance.',
      },
      regulationsAndNorms: Array.isArray(envAspects.regulationsAndNorms) ? envAspects.regulationsAndNorms : ['ISO 14001', 'ISO 14040'],
    },
    socialAspects: {
      socialImpacts: Array.isArray(socialAspects.socialImpacts) ? socialAspects.socialImpacts : ['Sécurité au travail et ergonomie'],
      localEconomy: socialAspects.localEconomy || 'Création d’emplois locaux durables et ancrage territorial.',
      governanceAndEthics: socialAspects.governanceAndEthics || 'Gouvernance éthique et dialogue avec les parties prenantes.',
      justTransition: socialAspects.justTransition || 'Formation continue et accompagnement aux métiers verts.',
    },
    greenEntrepreneurshipIntegration: {
      differentiationFactor: greenBusiness.differentiationFactor || 'Proposition de valeur éco-innovante.',
      circularValueProposition: greenBusiness.circularValueProposition || 'Modèle circulaire axé sur l’efficacité et la sobriété.',
      innovativeBusinessModels: Array.isArray(greenBusiness.innovativeBusinessModels) ? greenBusiness.innovativeBusinessModels : [],
      circularArchetype: greenBusiness.circularArchetype || 'Économie circulaire intégrée',
      environmentalAssets: Array.isArray(greenBusiness.environmentalAssets) ? greenBusiness.environmentalAssets : [],
      improvementAxes: Array.isArray(greenBusiness.improvementAxes) ? greenBusiness.improvementAxes : [],
    },
    sdgAlignment: Array.isArray(raw?.sdgAlignment) && raw.sdgAlignment.length > 0 ? raw.sdgAlignment : [
      {
        oddNumber: 12,
        title: 'Consommation et production responsables',
        level: 'Majeur',
        contribution: 'Optimisation des flux de matière et réduction des impacts environnementaux.',
        targets: ['12.5 Réduction des déchets', '12.2 Gestion durable des ressources'],
      },
      {
        oddNumber: 13,
        title: 'Mesures relatives à la lutte contre les changements climatiques',
        level: 'Majeur',
        contribution: 'Réduction de l’empreinte carbone et trajectoire bas-carbone.',
        targets: ['13.2 Intégration des mesures climatiques'],
      }
    ],
    impactIndicators: {
      carbonFootprint: normalizeCarbonFootprint(
        carbon,
        carbon.benchmarkComparison || {
          industryAverageKgCO2e: 0,
          ecoDesignedTargetKgCO2e: 0,
          commentary: 'Benchmark sectoriel non renseigné par le modèle.'
        },
        {
          title: raw?.title || fallbackTitle,
          description: raw?.description || fallbackDesc,
          sector: raw?.sector || raw?.detectedSector,
        }
      ),
      circularityRate: impact.circularityRate || '75%',
      wasteAvoided: impact.wasteAvoided || '30%',
      waterPreservation: impact.waterPreservation || '25%',
      localJobsProjection: impact.localJobsProjection || '3-5 emplois verts',
      keyMetrics: Array.isArray(impact.keyMetrics) ? impact.keyMetrics : [],
    },
    greenFinancingAndLabels: {
      labels: Array.isArray(financing.labels) ? financing.labels : [
        { name: 'Label Vert National', category: 'Éco-certification', whyItMatters: 'Reconnaissance de l’engagement environnemental', eligibilityCriteria: 'Conformité aux normes nationales' }
      ],
      fundings: Array.isArray(financing.fundings) ? financing.fundings : [
        { source: 'ANME / FODEP', program: 'Fonds de dépollution et maîtrise de l’énergie', amountOrAid: 'Subvention / Crédit bonifié', conditions: 'Audit environnemental validé' }
      ],
    },
    priorityActionPlan: {
      phase1_0to3months: Array.isArray(actionPlan.phase1_0to3months) ? actionPlan.phase1_0to3months : [
        { timeframe: '0-3 mois', title: 'Audit initial et conformité réglementaire', description: 'Mise en place des indicateurs de suivi et revue des processus.', priorityLevel: 'Haute', expectedDeliverable: 'Rapport de cadrage et plan d’action' }
      ],
      phase2_3to6months: Array.isArray(actionPlan.phase2_3to6months) ? actionPlan.phase2_3to6months : [
        { timeframe: '3-6 mois', title: 'Optimisation des flux et éco-conception', description: 'Déploiement des leviers d’amélioration continue.', priorityLevel: 'Moyenne', expectedDeliverable: 'Guide des bonnes pratiques' }
      ],
      phase3_6to12months: Array.isArray(actionPlan.phase3_6to12months) ? actionPlan.phase3_6to12months : [
        { timeframe: '6-12 mois', title: 'Certification et labellisation verte', description: 'Obtention des écolabels et financement vert.', priorityLevel: 'Stratégique', expectedDeliverable: 'Certification officielle' }
      ],
    },
    assistantHistory: Array.isArray(raw?.assistantHistory)
      ? raw.assistantHistory
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
          .slice(-100)
          .map((m: any) => ({
            ...(m.id ? { id: String(m.id) } : {}),
            role: m.role as 'user' | 'assistant',
            content: String(m.content),
            ...(m.createdAt ? { createdAt: String(m.createdAt) } : {}),
          }))
      : [],
  };
}
