import { ProjectAudit } from '../types';

export function normalizeProjectAudit(raw: any, fallbackTitle?: string, fallbackDesc?: string, fallbackLocation?: string): ProjectAudit {
  const synthesis = raw?.projectSynthesis || {};
  const scores = synthesis.scores || { environmental: 50, social: 50, circularity: 50, carbonMaturity: 50, globalScore: 50 };
  
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
        carbonMaturity: typeof scores.carbonMaturity === 'number' ? scores.carbonMaturity : 50,
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
      carbonFootprint: {
        functionalUnit: carbon.functionalUnit || '1 unité fonctionnelle / service',
        totalCarbonKgCO2e: typeof carbon.totalCarbonKgCO2e === 'number' ? carbon.totalCarbonKgCO2e : 120.5,
        benchmarkComparison: carbon.benchmarkComparison || {
          industryAverageKgCO2e: 180.0,
          ecoDesignedTargetKgCO2e: 100.0,
          commentary: 'Performance carbone optimisée par rapport au benchmark sectoriel.'
        },
        lifecycleStages: Array.isArray(carbon.lifecycleStages) ? carbon.lifecycleStages : [],
        highImpactDecarbonizationActions: Array.isArray(carbon.highImpactDecarbonizationActions) ? carbon.highImpactDecarbonizationActions : [],
      },
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
  };
}
