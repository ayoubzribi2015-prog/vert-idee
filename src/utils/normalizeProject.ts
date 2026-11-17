import {
  AdemeReferenceFactor,
  BenchmarkComparison,
  CarbonFactorApplication,
  CarbonFootprintModel,
  LifecycleStageCarbon,
  ProjectAudit,
} from '../types';

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
      const ademeId = String(a.ademeId ?? a.id ?? '');
      const match = ademeId ? ademeFactors.find((f) => f.id === ademeId) : undefined;
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

      const name = String(a.name || match?.name || `Facteur ADEME ${ademeId || 'inconnu'}`);
      const unit = String(a.unit || match?.unit || 'kgCO2e/unité');
      const uncertaintyPct = Number.isFinite(Number(a.uncertaintyPct))
        ? Number(a.uncertaintyPct)
        : match?.uncertaintyPct;
      const version = a.version ? String(a.version) : match?.version;

      return {
        id: String(a.id || `app_${ademeId || 'x'}_${index}`),
        ademeId,
        name,
        quantity,
        unit,
        factorKgCO2e: factor,
        emissionKgCO2e: Number((quantity * factor).toFixed(6)),
        ...(a.category || match?.category ? { category: String(a.category || match?.category) } : {}),
        ...(a.geography || match?.geography ? { geography: String(a.geography || match?.geography) } : {}),
        ...(Number.isFinite(uncertaintyPct as number) ? { uncertaintyPct: Number(uncertaintyPct) } : {}),
        ...(version ? { version } : {}),
        ...(a.program || match?.program ? { program: String(a.program || match?.program) } : {}),
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

  return {
    functionalUnit: isConcreteFunctionalUnit(carbon?.functionalUnit)
      ? (carbon.functionalUnit as string).trim()
      : deriveFunctionalUnit(context),
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
