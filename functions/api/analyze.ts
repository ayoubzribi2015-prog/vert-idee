import {
  discoverGeminiModels,
  ORDERED_GEMINI_MODELS,
  isTransientGeminiError,
  waitForRetry,
} from '../../src/utils/geminiModels.ts';
import { fetchContextualBaseCarboneFactors } from '../../src/utils/baseCarbone.ts';
import {
  isConcreteFunctionalUnit,
  isValidFunctionalUnitOptions,
  normalizeCarbonFootprint,
} from '../../src/utils/normalizeProject.ts';

type Context = {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
  };
};

const respond = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });

/**
 * STRICT_IA gate: a diagnostic is usable only when the model returned the full
 * carbon section with a concrete functional unit, positive stage breakdown and
 * at least one calculation line traceable to an ADEME factor ID.
 * No server-side deterministic value may replace a missing section.
 */
function hasTraceableCarbonFootprint(data: any): boolean {
  const cf = data?.impactIndicators?.carbonFootprint;
  if (!cf || typeof cf !== 'object') return false;
  if (!isConcreteFunctionalUnit(cf.functionalUnit)) return false;
  // The user must be able to choose among exactly four expert proposals.
  if (!isValidFunctionalUnitOptions(cf.functionalUnitOptions)) return false;

  const declaredTotal = Number(cf.totalCarbonKgCO2e);
  if (!Number.isFinite(declaredTotal) || declaredTotal <= 0) return false;

  const stages = Array.isArray(cf.lifecycleStages) ? cf.lifecycleStages : [];
  if (stages.length === 0) return false;

  const traceableStages = stages.filter(
    (stage: any) =>
      stage &&
      typeof stage === 'object' &&
      Array.isArray(stage.factorApplications) &&
      stage.factorApplications.some(
        (line: any) =>
          line &&
          String(line.ademeId || '').length > 0 &&
          Number.isFinite(Number(line.quantity)) &&
          Number(line.quantity) > 0 &&
          Number.isFinite(Number(line.factorKgCO2e)) &&
          Number(line.factorKgCO2e) > 0
      )
  );

  const stageSum = stages.reduce((sum: number, stage: any) => {
    const emission = Number(stage?.emissionKgCO2e);
    return sum + (Number.isFinite(emission) && emission > 0 ? emission : 0);
  }, 0);

  return traceableStages.length > 0 && stageSum > 0;
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respond({ success: false, error: 'Format de requête JSON invalide.' }, 400);
  }

  const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails, fullDocumentContent, answers } = body || {};

  if (!title || !description) {
    return respond({ success: false, error: 'Le titre et la description du projet sont obligatoires.' }, 400);
  }

  const apiKey = env?.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return respond(
      {
        success: false,
        error:
          "[Mode STRICT_IA] Échec du diagnostic : Clé GEMINI_API_KEY non configurée. Conformément au Mode STRICT_IA, les modes hybride et déterministe ont été éliminés : aucun fallback n'est autorisé.",
      },
      503
    );
  }

  const loc = (location || '').trim() || 'Tunisie';

  const systemPrompt = `
LANGUE OBLIGATOIRE : Tout le rapport d'expertise, les analyses, les synthèses, les arguments, les modèles d'affaires, les ODD, les indicateurs et les plans d'action DOIVENT IMPÉRATIVEMENT être rédigés en langue française irréprochable, professionnelle et scientifique.

Tu es le Collège d'Évaluation Environnementale de Vert'Idée.
Ta mission repose sur les méthodologies de référence internationales et nationales (ISO 14067:2018, ISO 14064-1:2018, Bibliothèque GreenGate.tn, Greenov'i, CITET, ANME, et Panorama des Méthodes d'Évaluation Environnementale - Institut Agro Montpellier / HAL) :
- **ISO 14067:2018 (Empreinte Carbone des Produits - ECP / CFP)** :
  * Quantification de l'empreinte carbone sur l'ensemble du cycle de vie rapportée à une Unité Fonctionnelle (UF) rigoureuse.
  * Règle absolue anti-greenwashing ISO 14067 : La compensation carbone n'est JAMAIS déduite de l'empreinte intrinsèque.
- **ISO 14064-1:2018 (Catégories 1 à 6)**.
- **ISO 14001 & ISO 14040/14044 (ACV)** : Analyse des AES (Criticité = [F × G × S] / M).
- **Référentiel GreenGate.tn & Greenov'i (UE / Expertise France / CITET)**.
- **Cadre des 17 ODD et 169 cibles de l'Agenda 2030 (ONU)**.

*** RÈGLE ÉTHIQUE & SÉCURITÉ ABSOLUE : TOLÉRANCE ZÉRO AU GREENWASHING ***
1. Projets conventionnels : Attribue des notes réalistes et modérées (40 à 70/100). Pour une huilerie traditionnelle, évaluer sur la gestion réelle des margines et de l'énergie sans surévaluer la "tradition".
2. Vraies éco-innovations : Scores élevés (75 à 90/100) uniquement sur preuves de rupture écologique mesurable.
3. Industries lourdes ou polluantes : Scores critiquement bas (15 à 32/100).

*** GRILLE DE SCORING MULTICRITÈRE TRANSPARENTE ET RIGOREUSE (0-100) ***
Pour garantir une fiabilité absolue et un diagnostic univoque, chaque note de pilier doit être attribuée selon les critères objectifs suivants :

1. SCORE ENVIRONNEMENTAL (Poids : 30%) :
   - Éco-conception et choix des matériaux (substitution des substances toxiques, approvisionnements durables).
   - Maîtrise des Aspects Environnementaux Significatifs (AES selon ISO 14001 : Fréquence, Gravité, Sensibilité, Maîtrise).
   - Préservation des ressources en eau, des écosystèmes et de la biodiversité (Guide OSS, écotoxicité ERA).
   - Respect strict du principe DNSH (Do No Significant Harm) et conformité réglementaire.
   - Échelle : 15-30 (industrie polluante sans traitement), 40-65 (procédé conventionnel conforme), 75-90 (éco-innovation régénératrice).

2. SCORE ÉCONOMIE CIRCULAIRE (Poids : 25%) :
   - Application rigoureuse des stratégies 9R (R0 Refuser à R9 Dégrader).
   - Bouclage des flux de matière et valorisation intégrale des coproduits et déchets (zéro déchet ultime).
   - Durabilité, modularité, réparabilité et économie de la fonctionnalité (EFC / PaaS).
   - Intégration des normes ISO 59004 / ISO 59020 et symbioses industrielles territoriales (EIT).
   - Échelle : 10-30 (linéaire pur sans revalorisation), 45-70 (tri sélectif et valorisation partielle), 75-95 (boucles fermées intégrées et symbioses).

3. SCORE SOCIAL & RSE (Poids : 20%) :
   - Santé, sécurité et conditions de travail (normes OIT, ergonomie, prévention des risques professionnels).
   - Impact sanitaire et bien-être des riverains (nuisances, rejets, poussières, bruit).
   - Ancrage territorial, création d'emplois locaux pérennes et non délocalisables.
   - Gouvernance éthique (ISO 26000), dialogue avec les parties prenantes et transition juste (formation aux métiers verts).
   - Échelle : 25-40 (conformité légale minimale), 50-70 (démarche RSE structurée), 75-90 (gouvernance partagée, inclusion et fort impact communautaire).

4. SCORE INNOVATION & FAISABILITÉ TECHNIQUE (Poids : 25%) :
   Ce critère combine 8 dimensions :
   - Utilisation de technologies propres.
   - Originalité du procédé ou du modèle économique.
   - Capacité à apporter une réponse nouvelle à un problème environnemental.
   - Maîtrise du processus de production.
   - Disponibilité des matières premières et intrants.
   - Accessibilité des équipements et technologies.
   - Disponibilité des compétences techniques.
   - Capacité de mise en œuvre.
   - Échelle : 20-35 (procédé non maîtrisé ou intrants/compétences indisponibles), 45-70 (faisabilité éprouvée mais faible originalité), 75-95 (technologies propres innovantes, réponse originale et forte maîtrise technique/mise en œuvre).

5. NOTE GLOBALE D'IMPACT (Moyenne pondérée officielle) :
   - Calculée strictement selon la formule : GlobalScore = (Environnement × 0.30) + (Économie Circulaire × 0.25) + (Social & RSE × 0.20) + (Innovation & Faisabilité technique × 0.25).

NOTE SUR LE SCORE ENVIRONNEMENTAL GLOBAL : Ce score DOIT intégrer l'évaluation de l'IA elle-même si elle est au cœur du projet (frugalité, bilan net positif supérieur aux coûts de calcul, eau, électricité).

Le rapport DOIT être structuré en JSON selon les 8 sections officielles :
1. projectSynthesis (scores 0-100: environmental, social, circularity, innovationFeasibility, globalScore; summary, vision)
2. environmentalAspects (strengths, criticalRisks, lifecycleAssessment, circularEconomy, regulationsAndNorms)
3. socialAspects (socialImpacts, localEconomy, governanceAndEthics, justTransition)
4. greenEntrepreneurshipIntegration (differentiationFactor, circularValueProposition, circularArchetype, competitiveMoat, iso59000Compliance, environmentalAssets, improvementAxes, innovativeBusinessModels, monetizationMechanisms, industrialSymbiosis, decouplingMetrics)
5. sdgAlignment (oddNumber, title, level, contribution, targets, targetsDetail, kpis, dnshAssessment, griStandards, csrdEsrs)
6. impactIndicators (carbonFootprint, circularityRate, wasteAvoided, waterPreservation, localJobsProjection, keyMetrics)
7. greenFinancingAndLabels (labels, fundings)
8. priorityActionPlan (phase1_0to3months, phase2_3to6months, phase3_6to12months)

RÈGLES OBLIGATOIRES DE CALCUL CARBONE (ISO 14067 / Base Carbone® ADEME) :
- functionalUnit DOIT être une unité fonctionnelle CONCRÈTE, MESURABLE et quantifiée déduite du projet (ex: "1 paire de chaussures de sécurité EN ISO 20345", "1 kg de plastique injecté", "1 000 pièces de bandes de plâtre stériles", "1 kWh d'électricité produite"). INTERDICTION FORMELLE des valeurs génériques ("1 unité", "unité fonctionnelle / service").
- Chaque lifecycleStages DOIT contenir factorApplications : postes {ademeId, name, quantity, unit, factorKgCO2e, emissionKgCO2e} où quantity est la quantité d'activité POUR l'unité fonctionnelle dans l'unité du facteur, et emissionKgCO2e = quantity × factorKgCO2e.
- L'émission d'une étape = somme de ses factorApplications ; totalCarbonKgCO2e = somme des émissions des étapes. Aucune émission d'étape sans poste traçable à un ID ADEME. Ne jamais renvoyer zéro faute de facteur exact : utiliser le facteur le plus proche avec son incertitude.

QUATRE PROPOSITIONS D'UNITÉ FONCTIONNELLE (VALIDATION UTILISATEUR, OBLIGATOIRE) :
- Le Collège des 4 Experts doit proposer EXACTEMENT 4 unités fonctionnelles dans functionalUnitOptions : {id, label, rationale, proposedBy, scaleFactor}, avec les identifiants "fu1", "fu2", "fu3", "fu4" et un expert différent par proposition (proposedBy = "Expert 1" à "Expert 4"). Chaque label porte sur le MÊME produit mais à une échelle de référence différente, et reste concret et quantifié.
- functionalUnit et functionalUnitBase reprennent le libellé de "fu1". Toutes les quantités de factorApplications sont exprimées POUR "fu1" (scaleFactor = 1).
- Pour chaque autre option, scaleFactor = (référence quantitative de l'option) / (référence quantitative de fu1). Exemple : si fu1 = "1 kg de plastique injecté", alors "1 tonne de plastique injecté" = 1000, "500 g de plastique injecté" = 0.5, "1 emballage de 500 g" = 0.5.
- Le système recalculera les émissions, le total, les pourcentages et le benchmark en multipliant les quantités ADEME par le scaleFactor de l'option que l'utilisateur validera. Ne propose donc que des facteurs d'échelle exacts et positifs.
`;

  const baseCarboneCtx = await fetchContextualBaseCarboneFactors({
    title,
    sector,
    description,
    location: loc,
    fullDocumentContent,
    timeoutMs: 4500,
  });

  const userPrompt = `
Voici le projet à auditer selon les 8 sections officielles :
- Titre : ${title}
- Description : ${description}
- Lieu d'implantation : ${loc}
${sector ? `- Secteur suggéré : ${sector}` : ''}
${targetAudience ? `- Cible suggérée : ${targetAudience}` : ''}
${businessModel ? `- Modèle économique suggéré : ${businessModel}` : ''}
${lifeCycleDetails ? `- Détails cycle de vie : ${lifeCycleDetails}` : ''}
${fullDocumentContent ? `- Documents importés :\n"""\n${String(fullDocumentContent).slice(0, 40000)}\n"""` : ''}
${answers ? `- Réponses complémentaires : ${JSON.stringify(answers)}` : ''}
${baseCarboneCtx.promptBlock ? `\n${baseCarboneCtx.promptBlock}\n` : ''}

Consigne : Réalise un audit direct et rigoureux en JSON valide.
`;

  const discovery = await discoverGeminiModels(apiKey, env?.GEMINI_MODEL);
  const models = discovery.models.length > 0
    ? discovery.models
    : [...ORDERED_GEMINI_MODELS];

  let parsedData: any = null;
  let lastError: any = null;
  let sawTransientUpstreamError = false;
  let sawInvalidModelResponse = false;
  const MAX_RETRIES_PER_MODEL = 2;
  const MAX_TOTAL_RETRIES = 5;
  let totalRetries = 0;
  let retriedModel = '';
  let retriesForCurrentModel = 0;

  for (let idx = 0; idx < models.length; idx++) {
    const model = models[idx];
    if (model !== retriedModel) {
      retriedModel = model;
      retriesForCurrentModel = 0;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), idx === 0 ? 90000 : 25000);

    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 32768,
              thinkingConfig: { thinkingLevel: "LOW" },
              responseSchema: {
                type: "OBJECT",
                properties: {
                  needsInfo: { type: "BOOLEAN" },
                  questions: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        id: { type: "STRING" },
                        question: { type: "STRING" },
                        options: { type: "ARRAY", items: { type: "STRING" } }
                      },
                      required: ["id", "question", "options"]
                    }
                  },
                  detectedSector: { type: "STRING" },
                  projectSynthesis: {
                    type: "OBJECT",
                    properties: {
                      scores: {
                        type: "OBJECT",
                        properties: {
                          environmental: { type: "NUMBER" },
                          social: { type: "NUMBER" },
                          circularity: { type: "NUMBER" },
                          innovationFeasibility: { type: "NUMBER" },
                          globalScore: { type: "NUMBER" }
                        },
                        required: ["environmental", "social", "circularity", "innovationFeasibility", "globalScore"]
                      },
                      summary: { type: "STRING" },
                      vision: { type: "STRING" }
                    },
                    required: ["scores", "summary", "vision"]
                  },
                  environmentalAspects: {
                    type: "OBJECT",
                    properties: {
                      strengths: { type: "ARRAY", items: { type: "STRING" } },
                      criticalRisks: { type: "ARRAY", items: { type: "STRING" } },
                      lifecycleAssessment: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            phase: { type: "STRING" },
                            impactLevel: { type: "STRING" },
                            details: { type: "STRING" },
                            ecoDesignLever: { type: "STRING" }
                          },
                          required: ["phase", "impactLevel", "details", "ecoDesignLever"]
                        }
                      },
                      circularEconomy: {
                        type: "OBJECT",
                        properties: {
                          strategies: { type: "ARRAY", items: { type: "STRING" } },
                          wasteValorization: { type: "STRING" },
                          durabilityRepair: { type: "STRING" }
                        },
                        required: ["strategies", "wasteValorization", "durabilityRepair"]
                      },
                      regulationsAndNorms: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["strengths", "criticalRisks", "lifecycleAssessment", "circularEconomy", "regulationsAndNorms"]
                  },
                  socialAspects: {
                    type: "OBJECT",
                    properties: {
                      socialImpacts: { type: "ARRAY", items: { type: "STRING" } },
                      localEconomy: { type: "STRING" },
                      governanceAndEthics: { type: "STRING" },
                      justTransition: { type: "STRING" }
                    },
                    required: ["socialImpacts", "localEconomy", "governanceAndEthics", "justTransition"]
                  },
                  greenEntrepreneurshipIntegration: {
                    type: "OBJECT",
                    properties: {
                      differentiationFactor: { type: "STRING" },
                      circularValueProposition: { type: "STRING" },
                      circularArchetype: { type: "STRING" },
                      competitiveMoat: { type: "STRING" },
                      iso59000Compliance: { type: "STRING" },
                      environmentalAssets: { type: "ARRAY", items: { type: "STRING" } },
                      improvementAxes: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            axis: { type: "STRING" },
                            lever: { type: "STRING" },
                            environmentalGain: { type: "STRING" },
                            economicPayoff: { type: "STRING" },
                            priority: { type: "STRING" }
                          },
                          required: ["axis", "lever", "environmentalGain", "economicPayoff"]
                        }
                      },
                      innovativeBusinessModels: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            title: { type: "STRING" },
                            description: { type: "STRING" },
                            feasibility: { type: "STRING" },
                            economicBenefit: { type: "STRING" },
                            archetype: { type: "STRING" },
                            strategy9R: { type: "STRING" },
                            revenueStream: { type: "STRING" },
                            targetCustomer: { type: "STRING" },
                            paybackPeriod: { type: "STRING" }
                          },
                          required: ["title", "description", "feasibility", "economicBenefit"]
                        }
                      },
                      monetizationMechanisms: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            name: { type: "STRING" },
                            category: { type: "STRING" },
                            description: { type: "STRING" },
                            directCashFlowImpact: { type: "STRING" }
                          },
                          required: ["name", "category", "description", "directCashFlowImpact"]
                        }
                      },
                      industrialSymbiosis: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            partner: { type: "STRING" },
                            fluxType: { type: "STRING" },
                            description: { type: "STRING" },
                            mutualBenefit: { type: "STRING" }
                          },
                          required: ["partner", "fluxType", "description", "mutualBenefit"]
                        }
                      },
                      decouplingMetrics: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            indicator: { type: "STRING" },
                            targetValue: { type: "STRING" },
                            methodology: { type: "STRING" }
                          },
                          required: ["indicator", "targetValue", "methodology"]
                        }
                      }
                    },
                    required: ["innovativeBusinessModels", "differentiationFactor", "circularValueProposition"]
                  },
                  sdgAlignment: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        oddNumber: { type: "INTEGER" },
                        title: { type: "STRING" },
                        level: { type: "STRING" },
                        contribution: { type: "STRING" },
                        targets: { type: "ARRAY", items: { type: "STRING" } },
                        targetsDetail: {
                          type: "ARRAY",
                          items: {
                            type: "OBJECT",
                            properties: {
                              code: { type: "STRING" },
                              title: { type: "STRING" },
                              indicator: { type: "STRING" },
                              targetKpi: { type: "STRING" }
                            },
                            required: ["code", "title"]
                          }
                        },
                        kpis: { type: "ARRAY", items: { type: "STRING" } },
                        dnshAssessment: { type: "STRING" },
                        griStandards: { type: "ARRAY", items: { type: "STRING" } },
                        csrdEsrs: { type: "STRING" }
                      },
                      required: ["oddNumber", "title", "contribution", "targets"]
                    }
                  },
                  impactIndicators: {
                    type: "OBJECT",
                    properties: {
                      carbonFootprint: {
                        type: "OBJECT",
                        properties: {
                          functionalUnit: { type: "STRING", description: "Unité fonctionnelle concrète et quantifiée de l'option fu1 (ex: '1 paire de chaussures', '1 kg de produit'). Jamais de formulation générique." },
                          functionalUnitBase: { type: "STRING", description: "Unité fonctionnelle de référence utilisée pour les quantités de factorApplications (identique à fu1)." },
                          functionalUnitOptions: {
                            type: "ARRAY",
                            description: "Exactement 4 propositions d'unités fonctionnelles, une par expert, à valider par l'utilisateur",
                            items: {
                              type: "OBJECT",
                              properties: {
                                id: { type: "STRING", description: "Identifiant stable : fu1, fu2, fu3 ou fu4" },
                                label: { type: "STRING", description: "Unité fonctionnelle concrète et quantifiée du même produit" },
                                rationale: { type: "STRING", description: "Justification courte de la pertinence de cette unité" },
                                proposedBy: { type: "STRING", description: "Expert auteur de la proposition (Expert 1 à Expert 4)" },
                                scaleFactor: { type: "NUMBER", description: "Multiplicateur exact par rapport à fu1 (fu1 = 1), strictement positif" },
                              },
                              required: ["id", "label", "rationale", "proposedBy", "scaleFactor"],
                            },
                          },
                          totalCarbonKgCO2e: { type: "NUMBER" },
                          benchmarkComparison: {
                            type: "OBJECT",
                            properties: {
                              industryAverageKgCO2e: { type: "NUMBER" },
                              ecoDesignedTargetKgCO2e: { type: "NUMBER" },
                              commentary: { type: "STRING" }
                            },
                            required: ["industryAverageKgCO2e", "ecoDesignedTargetKgCO2e", "commentary"]
                          },
                          lifecycleStages: {
                            type: "ARRAY",
                            items: {
                              type: "OBJECT",
                              properties: {
                                id: { type: "STRING" },
                                name: { type: "STRING" },
                                category: { type: "STRING" },
                                emissionKgCO2e: { type: "NUMBER" },
                                percentage: { type: "NUMBER" },
                                description: { type: "STRING" },
                                reductionOpportunity: { type: "STRING" },
                                factorApplications: {
                                  type: "ARRAY",
                                  description: "Postes de calcul : émission = quantity × factorKgCO2e, traçable à un ID ADEME",
                                  items: {
                                    type: "OBJECT",
                                    properties: {
                                      ademeId: { type: "STRING" },
                                      name: { type: "STRING" },
                                      quantity: { type: "NUMBER" },
                                      unit: { type: "STRING" },
                                      factorKgCO2e: { type: "NUMBER" },
                                      emissionKgCO2e: { type: "NUMBER" }
                                    },
                                    required: ["ademeId", "name", "quantity", "unit", "factorKgCO2e", "emissionKgCO2e"]
                                  }
                                }
                              },
                              required: ["id", "name", "category", "emissionKgCO2e", "percentage", "description", "reductionOpportunity", "factorApplications"]
                            }
                          },
                          highImpactDecarbonizationActions: {
                            type: "ARRAY",
                            items: {
                              type: "OBJECT",
                              properties: {
                                action: { type: "STRING" },
                                estimatedReductionPct: { type: "NUMBER" },
                                priority: { type: "STRING" }
                              },
                              required: ["action", "estimatedReductionPct", "priority"]
                            }
                          },
                          ademeReferenceFactors: {
                            type: "ARRAY",
                            items: {
                              type: "OBJECT",
                              properties: {
                                id: { type: "STRING" },
                                name: { type: "STRING" },
                                attribute: { type: "STRING" },
                                category: { type: "STRING" },
                                factorKgCO2e: { type: "NUMBER" },
                                unit: { type: "STRING" },
                                geography: { type: "STRING" },
                                uncertaintyPct: { type: "NUMBER" },
                                appliedStage: { type: "STRING" }
                              },
                              required: ["id", "name", "factorKgCO2e", "unit"]
                            }
                          }
                        },
                        required: ["functionalUnit", "functionalUnitOptions", "totalCarbonKgCO2e", "benchmarkComparison", "lifecycleStages", "highImpactDecarbonizationActions"]
                      },
                      circularityRate: { type: "STRING" },
                      wasteAvoided: { type: "STRING" },
                      waterPreservation: { type: "STRING" },
                      localJobsProjection: { type: "STRING" },
                      keyMetrics: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            label: { type: "STRING" },
                            value: { type: "STRING" },
                            unit: { type: "STRING" },
                            interpretation: { type: "STRING" }
                          },
                          required: ["label", "value", "unit", "interpretation"]
                        }
                      }
                    },
                    required: ["carbonFootprint", "circularityRate", "wasteAvoided", "waterPreservation", "localJobsProjection", "keyMetrics"]
                  },
                  greenFinancingAndLabels: {
                    type: "OBJECT",
                    properties: {
                      labels: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            name: { type: "STRING" },
                            category: { type: "STRING" },
                            whyItMatters: { type: "STRING" },
                            eligibilityCriteria: { type: "STRING" }
                          },
                          required: ["name", "category", "whyItMatters", "eligibilityCriteria"]
                        }
                      },
                      fundings: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            source: { type: "STRING" },
                            program: { type: "STRING" },
                            amountOrAid: { type: "STRING" },
                            conditions: { type: "STRING" }
                          },
                          required: ["source", "program", "amountOrAid", "conditions"]
                        }
                      }
                    },
                    required: ["labels", "fundings"]
                  },
                  priorityActionPlan: {
                    type: "OBJECT",
                    properties: {
                      phase1_0to3months: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            timeframe: { type: "STRING" },
                            title: { type: "STRING" },
                            description: { type: "STRING" },
                            priorityLevel: { type: "STRING" },
                            expectedDeliverable: { type: "STRING" }
                          },
                          required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                        }
                      },
                      phase2_3to6months: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            timeframe: { type: "STRING" },
                            title: { type: "STRING" },
                            description: { type: "STRING" },
                            priorityLevel: { type: "STRING" },
                            expectedDeliverable: { type: "STRING" }
                          },
                          required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                        }
                      },
                      phase3_6to12months: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            timeframe: { type: "STRING" },
                            title: { type: "STRING" },
                            description: { type: "STRING" },
                            priorityLevel: { type: "STRING" },
                            expectedDeliverable: { type: "STRING" }
                          },
                          required: ["timeframe", "title", "description", "priorityLevel", "expectedDeliverable"]
                        }
                      }
                    },
                    required: ["phase1_0to3months", "phase2_3to6months", "phase3_6to12months"]
                  }
                },
                required: [
                  "projectSynthesis",
                  "environmentalAspects",
                  "socialAspects",
                  "greenEntrepreneurshipIntegration",
                  "sdgAlignment",
                  "impactIndicators",
                  "greenFinancingAndLabels",
                  "priorityActionPlan",
                ],
              }
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      if (upstream.ok) {
        const json = await upstream.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const rawText = parts.filter((p: any) => p && typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join('') || parts[0]?.text || '';
        const text = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        if (text) {
          const candidate = JSON.parse(text);
          if (candidate?.needsInfo === true) {
            parsedData = candidate;
            break;
          }
          if (candidate?.projectSynthesis && hasTraceableCarbonFootprint(candidate)) {
            parsedData = candidate;
            break;
          }
          sawInvalidModelResponse = true;
          lastError = new Error(
            `Réponse incomplète du modèle ${model} : impactIndicators.carbonFootprint absent ou non traçable aux facteurs ADEME.`
          );
          continue;
        }
        sawInvalidModelResponse = true;
        lastError = new Error(`Réponse vide du modèle ${model}`);
      } else {
        const errJson = await upstream.json().catch(() => ({}));
        const message = String(errJson?.error?.message || `HTTP ${upstream.status}`);
        lastError = new Error(message);
        if (isTransientGeminiError(upstream.status, message)) {
          sawTransientUpstreamError = true;
          if (retriesForCurrentModel < MAX_RETRIES_PER_MODEL && totalRetries < MAX_TOTAL_RETRIES) {
            retriesForCurrentModel++;
            totalRetries++;
            await waitForRetry(1000 * retriesForCurrentModel);
            idx--; // same model: this is a temporary overload, not a bad answer
            continue;
          }
        }
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (isTransientGeminiError(undefined, err?.message)) {
        sawTransientUpstreamError = true;
        if (retriesForCurrentModel < MAX_RETRIES_PER_MODEL && totalRetries < MAX_TOTAL_RETRIES) {
          retriesForCurrentModel++;
          totalRetries++;
          await waitForRetry(1000 * retriesForCurrentModel);
          idx--; // same model: transient network failure
          continue;
        }
      }
    }
  }

  if (parsedData?.needsInfo) {
    return respond({ success: true, needsInfo: true, questions: parsedData.questions });
  }

  if (!parsedData || !parsedData.projectSynthesis || !hasTraceableCarbonFootprint(parsedData)) {
    if (sawTransientUpstreamError && !sawInvalidModelResponse) {
      return respond(
        {
          success: false,
          retryable: true,
          error:
            "[Mode STRICT_IA] Le modèle d'intelligence artificielle est momentanément surchargé (forte demande). Réessayez dans quelques instants : aucun total carbone n'a été inventé, conformément au Mode STRICT_IA : aucun fallback déterministe n'est autorisé.",
          detail: lastError?.message || undefined,
        },
        503
      );
    }
    return respond(
      {
        success: false,
        error: `[Mode STRICT_IA] Échec du diagnostic : le modèle n'a pas fourni un bilan carbone complet et traçable (unité fonctionnelle concrète, étapes et facteurs ADEME V23.11). Aucun total carbone n'a été inventé, conformément au Mode STRICT_IA : aucun fallback déterministe n'est autorisé. (${lastError?.message || 'Réponse IA incomplète'})`,
      },
      503
    );
  }

  const finalSector = parsedData.detectedSector || sector || 'Économie Circulaire & Éco-innovation';
  const carbonFootprint = parsedData.impactIndicators.carbonFootprint;

  // Traceability: rebuild the ADEME reference table exclusively from the frozen
  // local V23.11 index. Empty, invalid or AI-invented tables are replaced; every
  // retained line keeps ID, version, unit, uncertainty, programme and source.
  const localFactors = baseCarboneCtx.factors;
  const localFactorsById = new Map(localFactors.map((factor) => [factor.id, factor]));
  const referencedIds = new Set<string>();
  for (const stage of carbonFootprint.lifecycleStages || []) {
    for (const line of stage?.factorApplications || []) {
      const id = String(line?.ademeId || '');
      if (id) referencedIds.add(id);
    }
  }
  const resolvedFromStages = [...referencedIds]
    .map((id) => localFactorsById.get(id))
    .filter((factor): factor is (typeof localFactors)[number] => Boolean(factor));
  const seenFactorIds = new Set<string>();
  carbonFootprint.ademeReferenceFactors = [...resolvedFromStages, ...localFactors.slice(0, 6)].filter(
    (factor) => {
      if (!factor?.id || seenFactorIds.has(factor.id)) return false;
      seenFactorIds.add(factor.id);
      return true;
    }
  );

  // Deterministic factor-based recomputation: stage = Σ(quantity × ADEME factor),
  // total = Σ(stages). A benchmark is context only and never seeds a total.
  parsedData.impactIndicators.carbonFootprint = normalizeCarbonFootprint(
    carbonFootprint,
    carbonFootprint.benchmarkComparison || {
      industryAverageKgCO2e: 0,
      ecoDesignedTargetKgCO2e: 0,
      commentary: 'Benchmark sectoriel non renseigné par le modèle.',
    },
    {
      title: parsedData.title || title,
      description: parsedData.description || description,
      sector: finalSector,
    }
  );

  const auditResult = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    sector: finalSector,
    description,
    location: loc,
    targetAudience: targetAudience || 'B2B / B2C Éco-responsable',
    businessModel: businessModel || 'Économie Circulaire & Vente directe',
    lifeCycleDetails: lifeCycleDetails || '',
    createdAt: new Date().toISOString(),
    ...parsedData,
  };

  return respond({ success: true, data: auditResult });
};
