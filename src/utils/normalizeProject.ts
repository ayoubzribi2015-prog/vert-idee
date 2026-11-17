import {
  BenchmarkComparison,
  CarbonFootprintModel,
  LifecycleStageCarbon,
  ProjectAudit,
} from '../types';

const DEFAULT_CARBON_TOTAL = 120.5;

const CARBON_STAGE_CATEGORIES: LifecycleStageCarbon['category'][] = [
  'raw_materials',
  'manufacturing',
  'packaging',
  'transport',
  'usage',
  'end_of_life',
];

/**
 * Deterministic 6-stage ISO 14064-1 breakdown used only when the AI returns no
 * usable stage emissions. It preserves the footprint total without inventing a
 * new figure; the weights are a transparent estimation, not ADEME factors.
 */
export function buildDefaultLifecycleStages(totalKgCO2e: number): LifecycleStageCarbon[] {
  const definitions = [
    { id: 'raw_materials', name: 'Approvisionnement & matières premières', category: 'raw_materials' as const, weight: 0.34, description: 'Intrants et matières premières (Catégorie 4 ISO 14064-1).', reductionOpportunity: 'Privilégier matières recyclées et circuits courts.' },
    { id: 'manufacturing', name: 'Fabrication & procédés', category: 'manufacturing' as const, weight: 0.26, description: 'Procédés de production et énergie importée (Catégories 1-2).', reductionOpportunity: 'Électrifier les procédés et recourir aux énergies renouvelables.' },
    { id: 'packaging', name: 'Conditionnement & emballages', category: 'packaging' as const, weight: 0.10, description: 'Emballages et intrants de conditionnement (Catégorie 4).', reductionOpportunity: 'Réduire, réutiliser et recycler les emballages.' },
    { id: 'transport', name: 'Transport & logistique', category: 'transport' as const, weight: 0.14, description: 'Fret amont et aval, mobilité (Catégorie 3).', reductionOpportunity: 'Reporter le fret sur le rail et optimiser les tournées.' },
    { id: 'usage', name: 'Utilisation', category: 'usage' as const, weight: 0.08, description: 'Émissions de la phase d’utilisation du produit (Catégorie 5).', reductionOpportunity: 'Allonger la durée de vie et améliorer l’efficacité énergétique.' },
    { id: 'end_of_life', name: 'Fin de vie & valorisation', category: 'end_of_life' as const, weight: 0.08, description: 'Traitement des déchets et valorisation (Catégorie 5).', reductionOpportunity: 'Organiser la reprise et le recyclage des matériaux.' },
  ];

  return definitions.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    emissionKgCO2e: Number((totalKgCO2e * d.weight).toFixed(4)),
    percentage: Number((d.weight * 100).toFixed(1)),
    description: `${d.description} Répartition estimative par défaut, à confirmer par les facteurs ADEME.`,
    reductionOpportunity: d.reductionOpportunity,
  }));
}

/** Keep the headline total and the stage breakdown consistent before rendering. */
function normalizeCarbonFootprint(carbon: any, benchmark: BenchmarkComparison): CarbonFootprintModel {
  const rawTotal = Number(carbon.totalCarbonKgCO2e);
  const rawStages = Array.isArray(carbon.lifecycleStages) ? carbon.lifecycleStages : [];

  const stages: LifecycleStageCarbon[] = rawStages
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any) => {
      const emission = Number(s.emissionKgCO2e);
      return {
        id: typeof s.id === 'string' && s.id ? s.id : String(s.category || 'stage'),
        name: typeof s.name === 'string' && s.name ? s.name : 'Étape du cycle de vie',
        category: CARBON_STAGE_CATEGORIES.includes(s.category) ? s.category : 'manufacturing',
        emissionKgCO2e: Number.isFinite(emission) && emission > 0 ? emission : 0,
        percentage: Number.isFinite(Number(s.percentage)) ? Number(s.percentage) : 0,
        description: typeof s.description === 'string' ? s.description : '',
        reductionOpportunity: typeof s.reductionOpportunity === 'string' ? s.reductionOpportunity : '',
      };
    });

  const stageSum = stages.reduce((sum, s) => sum + s.emissionKgCO2e, 0);
  let total = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : stageSum;
  if (!Number.isFinite(total) || total <= 0) {
    total = Number.isFinite(benchmark.industryAverageKgCO2e) && benchmark.industryAverageKgCO2e > 0
      ? benchmark.industryAverageKgCO2e
      : DEFAULT_CARBON_TOTAL;
  }

  let normalizedStages: LifecycleStageCarbon[];
  if (stageSum <= 0) {
    // The calculator sums stages, so an empty/zero breakdown would display 0.00
    // even though a positive footprint total is known.
    normalizedStages = buildDefaultLifecycleStages(total);
  } else if (Math.abs(stageSum - total) > 0.01) {
    const scale = total / stageSum;
    normalizedStages = stages.map((s) => ({ ...s, emissionKgCO2e: s.emissionKgCO2e * scale }));
  } else {
    normalizedStages = stages;
  }

  normalizedStages = normalizedStages.map((s) => ({
    ...s,
    percentage: total > 0 ? (s.emissionKgCO2e / total) * 100 : 0,
  }));

  return {
    functionalUnit: carbon.functionalUnit || '1 unité fonctionnelle / service',
    totalCarbonKgCO2e: total,
    benchmarkComparison: benchmark,
    lifecycleStages: normalizedStages,
    highImpactDecarbonizationActions: Array.isArray(carbon.highImpactDecarbonizationActions)
      ? carbon.highImpactDecarbonizationActions
      : [],
    ademeReferenceFactors: Array.isArray(carbon.ademeReferenceFactors)
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
      : [],
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
      carbonFootprint: normalizeCarbonFootprint(carbon, carbon.benchmarkComparison || {
        industryAverageKgCO2e: 180.0,
        ecoDesignedTargetKgCO2e: 100.0,
        commentary: 'Performance carbone optimisée par rapport au benchmark sectoriel.'
      }),
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
