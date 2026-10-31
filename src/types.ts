export interface SustainabilityScores {
  environmental: number;
  social: number;
  circularity: number;
  carbonMaturity: number;
  globalScore: number;
}

export interface LifecycleAssessmentItem {
  phase: string;
  impactLevel: 'faible' | 'moyen' | 'eleve';
  details: string;
  ecoDesignLever: string;
}

export interface CircularEconomy {
  strategies: string[];
  wasteValorization: string;
  durabilityRepair: string;
}

export interface EnvironmentalAspects {
  strengths: string[];
  criticalRisks: string[];
  lifecycleAssessment: LifecycleAssessmentItem[];
  circularEconomy: CircularEconomy;
  regulationsAndNorms: string[];
}

export interface SocialAspects {
  socialImpacts: string[];
  localEconomy: string;
  governanceAndEthics: string;
  justTransition: string;
}

export interface BusinessModelIdea {
  title: string;
  description: string;
  feasibility: string;
  economicBenefit: string;
  archetype?: string;
  strategy9R?: string;
  revenueStream?: string;
  targetCustomer?: string;
  paybackPeriod?: string;
}

export interface CircularMonetizationMechanism {
  name: string;
  category: 'Usage & Performance' | 'Boucle Matière & Valorisation' | 'Service & Maintenance' | 'Plateforme & Données' | 'CAPEX' | 'OPEX' | 'Revenus Nouveaux' | 'Économie Fiscale & Subventions' | string;
  description: string;
  directCashFlowImpact?: string;
  cashFlowImpact?: string;
}

export interface IndustrialSymbiosisSynergy {
  partner: string;
  partnerType?: string;
  fluxType?: 'Matière / Coproduit' | 'Énergie & Chaleur fatale' | 'Eau & Effluents' | 'Logistique & Espaces' | string;
  inputOutputFlow?: string;
  description: string;
  environmentalBenefit?: string;
  mutualBenefit: string;
  economicValue?: string;
}

export interface DecouplingMetric {
  indicator: string;
  metric?: string;
  targetValue: string;
  target?: string;
  baselineLinear?: string;
  decouplingFactor?: string;
  methodology: string;
}

export interface GreenImprovementAxis {
  axis: string;
  lever: string;
  environmentalGain: string;
  economicPayoff: string;
  priority?: 'Haute' | 'Moyenne' | 'Stratégique';
}

export interface GreenEntrepreneurshipIntegration {
  differentiationFactor: string;
  circularValueProposition: string;
  innovativeBusinessModels: BusinessModelIdea[];
  circularArchetype?: string;
  iso59000Compliance?: string;
  competitiveMoat?: string;
  environmentalAssets?: string[];
  improvementAxes?: GreenImprovementAxis[];
  monetizationMechanisms?: CircularMonetizationMechanism[];
  industrialSymbiosis?: IndustrialSymbiosisSynergy[];
  decouplingMetrics?: DecouplingMetric[];
}

export interface SdgTargetDetail {
  code: string;
  title: string;
  indicator?: string;
  targetKpi?: string;
}

export interface SdgAlignmentItem {
  oddNumber: number;
  title: string;
  contribution: string;
  targets: string[];
  level?: 'Majeur' | 'Secondaire';
  targetsDetail?: SdgTargetDetail[];
  kpis?: string[];
  dnshAssessment?: string;
  griStandards?: string[];
  csrdEsrs?: string;
}

export interface LifecycleStageCarbon {
  id: string;
  name: string;
  category: 'raw_materials' | 'manufacturing' | 'packaging' | 'transport' | 'usage' | 'end_of_life';
  emissionKgCO2e: number;
  percentage: number;
  description: string;
  reductionOpportunity: string;
}

export interface BenchmarkComparison {
  industryAverageKgCO2e: number;
  ecoDesignedTargetKgCO2e: number;
  commentary: string;
}

export interface DecarbonizationAction {
  action: string;
  estimatedReductionPct: number;
  priority: 'P1' | 'P2' | 'P3';
}

export interface CarbonFootprintModel {
  functionalUnit: string;
  totalCarbonKgCO2e: number;
  benchmarkComparison: BenchmarkComparison;
  lifecycleStages: LifecycleStageCarbon[];
  highImpactDecarbonizationActions: DecarbonizationAction[];
}

export interface ImpactIndicators {
  carbonFootprint: CarbonFootprintModel;
  circularityRate: string;
  wasteAvoided: string;
  waterPreservation: string;
  localJobsProjection: string;
  keyMetrics: Array<{
    label: string;
    value: string;
    unit: string;
    interpretation: string;
  }>;
}

export interface RecommendedLabel {
  name: string;
  category: string;
  whyItMatters: string;
  eligibilityCriteria: string;
}

export interface GreenFundingOpportunity {
  source: string;
  program: string;
  amountOrAid: string;
  conditions: string;
}

export interface GreenFinancingAndLabels {
  labels: RecommendedLabel[];
  fundings: GreenFundingOpportunity[];
}

export interface PriorityActionItem {
  timeframe: '0-3 mois' | '3-6 mois' | '6-12 mois';
  title: string;
  description: string;
  priorityLevel: 'Haute' | 'Moyenne' | 'Stratégique';
  expectedDeliverable: string;
}

export interface PriorityActionPlan {
  phase1_0to3months: PriorityActionItem[];
  phase2_3to6months: PriorityActionItem[];
  phase3_6to12months: PriorityActionItem[];
}

export interface TabItem {
  key: TabKey;
  number?: number;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

export type TabKey =
  | 'synthesis'
  | 'environmental'
  | 'social'
  | 'greenBusiness'
  | 'sdg'
  | 'impact'
  | 'financing'
  | 'actionPlan'
  | 'assistant';

export const SIDEBAR_TABS: TabItem[] = [
  {
    key: 'synthesis',
    number: 1,
    label: '1. Synthèse du projet',
    shortLabel: '1. Synthèse',
    icon: null,
  },
  {
    key: 'environmental',
    number: 2,
    label: '2. Aspects & impacts environnementaux',
    shortLabel: '2. Env. & Impacts',
    icon: null,
  },
  {
    key: 'social',
    number: 3,
    label: '3. Aspects & impacts sociaux et sociétaux',
    shortLabel: '3. Social & Impacts',
    icon: null,
  },
  {
    key: 'greenBusiness',
    number: 4,
    label: "4. Intégration de l'entrepreneuriat vert",
    shortLabel: '4. Modèles Verts',
    icon: null,
  },
  {
    key: 'sdg',
    number: 5,
    label: '5. Alignement ODD',
    shortLabel: '5. ODD',
    icon: null,
  },
  {
    key: 'impact',
    number: 6,
    label: "6. Indicateurs d'impact",
    shortLabel: '6. Impact & Carbone',
    icon: null,
  },
  {
    key: 'financing',
    number: 7,
    label: '7. Financements et labels verts',
    shortLabel: '7. Financements',
    icon: null,
  },
  {
    key: 'actionPlan',
    number: 8,
    label: "8. Plan d'action prioritaire",
    shortLabel: "8. Plan d'action",
    icon: null,
  },
];

export const WORK_TABS: TabItem[] = [...SIDEBAR_TABS];

export interface ProjectAudit {
  id: string;
  userId?: string;
  title: string;
  sector: string;
  description: string;
  location?: string;
  targetAudience?: string;
  businessModel?: string;
  lifeCycleDetails?: string;
  createdAt: string;
  updatedAt?: string;

  // 1. Synthèse du projet
  projectSynthesis: {
    scores: SustainabilityScores;
    summary: string;
    vision: string;
  };

  // 2. Aspects & impacts environnementaux
  environmentalAspects: EnvironmentalAspects;

  // 3. Aspects & impacts sociaux et sociétaux
  socialAspects: SocialAspects;

  // 4. Intégration de l'entrepreneuriat vert
  greenEntrepreneurshipIntegration: GreenEntrepreneurshipIntegration;

  // 5. Alignement ODD
  sdgAlignment: SdgAlignmentItem[];

  // 6. Indicateurs d'impact
  impactIndicators: ImpactIndicators;

  // 7. Financements et labels verts envisageables
  greenFinancingAndLabels: GreenFinancingAndLabels;

  // 8. Plan d'action prioritaire
  priorityActionPlan: PriorityActionPlan;

  // 9. Validation d'expert supplémentaire
  thirdExpertValidation?: {
    summary: string;
    validationStatus: string;
  };
}
