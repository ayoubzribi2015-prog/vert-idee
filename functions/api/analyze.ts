import { discoverGeminiModels, ORDERED_GEMINI_MODELS } from '../../src/utils/geminiModels.ts';

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

4. SCORE MATURITÉ CARBONE (Poids : 25%) :
   - Quantification rigoureuse du bilan GES sur le cycle de vie (ISO 14067 ECP & ISO 14064-1 Scopes 1-2-3).
   - Règle absolue anti-greenwashing : exclusion stricte de toute compensation carbone (offsets) dans le calcul de l'empreinte intrinsèque.
   - Comparaison sectorielle (sur-émissions vs émissions évitées par rapport à la moyenne du secteur).
   - Ambition et quantification du plan de décarbonation (actions P1, P2, P3 basées sur la science).
   - Échelle : 20-35 (empreinte supérieure au secteur sans plan de réduction), 45-70 (réduction modérée -15% à -30%), 75-95 (décarbonation radicale -40% à -70% et trajectoire neutre).

5. NOTE GLOBALE D'IMPACT (Moyenne pondérée officielle) :
   - Calculée strictement selon la formule : GlobalScore = (Environnement × 0.30) + (Économie Circulaire × 0.25) + (Social & RSE × 0.20) + (Maturité Carbone × 0.25).

NOTE SUR LE SCORE ENVIRONNEMENTAL GLOBAL : Ce score DOIT intégrer l'évaluation de l'IA elle-même si elle est au cœur du projet (frugalité, bilan net positif supérieur aux coûts de calcul, eau, électricité).

Le rapport DOIT être structuré en JSON selon les 8 sections officielles :
1. projectSynthesis (scores 0-100: environmental, social, circularity, carbonMaturity, globalScore; summary, vision)
2. environmentalAspects (strengths, criticalRisks, lifecycleAssessment, circularEconomy, regulationsAndNorms)
3. socialAspects (socialImpacts, localEconomy, governanceAndEthics, justTransition)
4. greenEntrepreneurshipIntegration (differentiationFactor, circularValueProposition, circularArchetype, competitiveMoat, iso59000Compliance, environmentalAssets, improvementAxes, innovativeBusinessModels, monetizationMechanisms, industrialSymbiosis, decouplingMetrics)
5. sdgAlignment (oddNumber, title, level, contribution, targets, targetsDetail, kpis, dnshAssessment, griStandards, csrdEsrs)
6. impactIndicators (carbonFootprint, circularityRate, wasteAvoided, waterPreservation, localJobsProjection, keyMetrics)
7. greenFinancingAndLabels (labels, fundings)
8. priorityActionPlan (phase1_0to3months, phase2_3to6months, phase3_6to12months)
`;

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

Consigne : Réalise un audit direct et rigoureux en JSON valide.
`;

  const discovery = await discoverGeminiModels(apiKey, env?.GEMINI_MODEL);
  const models = discovery.models.length > 0
    ? discovery.models
    : [...ORDERED_GEMINI_MODELS];

  let parsedData: any = null;
  let lastError: any = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);

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
              maxOutputTokens: 8192,
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
                          carbonMaturity: { type: "NUMBER" },
                          globalScore: { type: "NUMBER" }
                        },
                        required: ["environmental", "social", "circularity", "carbonMaturity", "globalScore"]
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
                          functionalUnit: { type: "STRING" },
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
                                reductionOpportunity: { type: "STRING" }
                              },
                              required: ["id", "name", "category", "emissionKgCO2e", "percentage", "description", "reductionOpportunity"]
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
                          }
                        },
                        required: ["functionalUnit", "totalCarbonKgCO2e", "benchmarkComparison", "lifecycleStages", "highImpactDecarbonizationActions"]
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
                }
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
        const text = parts.find((p: any) => p.text && !p.thought)?.text || parts[0]?.text;
        if (text) {
          parsedData = JSON.parse(text);
          break;
        }
      } else {
        const errJson = await upstream.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `HTTP ${upstream.status}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  if (!parsedData || !parsedData.projectSynthesis) {
    return respond(
      {
        success: false,
        error: `[Mode STRICT_IA] Échec du diagnostic : Le modèle d'intelligence artificielle est indisponible ou n'a pas répondu (${lastError?.message || 'Erreur IA'}). Conformément au Mode STRICT_IA, les modes hybride et déterministe ont été éliminés : aucun fallback n'est autorisé.`,
      },
      503
    );
  }

  if (parsedData.needsInfo) {
    return respond({ success: true, needsInfo: true, questions: parsedData.questions });
  }

  const finalSector = parsedData.detectedSector || sector || 'Économie Circulaire & Éco-innovation';
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
