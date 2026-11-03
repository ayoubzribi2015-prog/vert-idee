import { discoverGeminiModels } from '../../src/utils/geminiModels.ts';

type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };

const respond = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate' } });

const resolveLocation = (value?: string | null) => (value || '').trim() || 'Tunisie';

async function generateStrict(apiKey: string, models: string[], systemPrompt: string, userPrompt: string) {
  let lastError = 'Aucun modèle Gemini disponible.';
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingLevel: 'LOW' },
            responseMimeType: 'application/json',
            responseSchema: {
          type: "OBJECT",
          properties: {
            needsInfo: { type: "BOOLEAN", description: 'Indique si des informations supplémentaires sont nécessaires avant l\'analyse' },
            questions: {
              type: "ARRAY",
              description: 'Liste de questions si needsInfo est vrai',
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  question: { type: "STRING" },
                  options: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ['id', 'question', 'options'],
              },
            },
            detectedSector: { type: "STRING", description: 'Secteur d\'activité déterminé pour le projet' },
            // 1. Synthèse du projet
            projectSynthesis: {
              type: "OBJECT",
              properties: {
                scores: {
                  type: "OBJECT",
                  properties: {
                    environmental: { type: "NUMBER", description: 'Score environnemental 0-100' },
                    social: { type: "NUMBER", description: 'Score social 0-100' },
                    circularity: { type: "NUMBER", description: 'Score circularité 0-100' },
                    carbonMaturity: { type: "NUMBER", description: 'Score maturité carbone 0-100' },
                    globalScore: { type: "NUMBER", description: 'Score global 0-100' },
                  },
                  required: ['environmental', 'social', 'circularity', 'carbonMaturity', 'globalScore'],
                },
                summary: { type: "STRING" },
                vision: { type: "STRING" },
              },
              required: ['scores', 'summary', 'vision'],
            },

            // 2. Aspects & impacts environnementaux
            environmentalAspects: {
              type: "OBJECT",
              properties: {
                strengths: { type: "ARRAY", items: { type: "STRING" }, description: 'Impacts environnementaux positifs, atouts écologiques et gains nets' },
                criticalRisks: { type: "ARRAY", items: { type: "STRING" }, description: 'Impacts environnementaux négatifs, pollutions potentielles et AES critiques' },
                lifecycleAssessment: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      phase: { type: "STRING" },
                      impactLevel: { type: "STRING", enum: ['faible', 'moyen', 'eleve'] },
                      details: { type: "STRING", description: 'Nature et diagnostic précis des impacts de cette phase' },
                      ecoDesignLever: { type: "STRING", description: 'Levier d\'éco-conception pour atténuer ou éliminer cet impact' },
                    },
                    required: ['phase', 'impactLevel', 'details', 'ecoDesignLever'],
                  },
                },
                circularEconomy: {
                  type: "OBJECT",
                  properties: {
                    strategies: { type: "ARRAY", items: { type: "STRING" } },
                    wasteValorization: { type: "STRING", description: 'Impact sur la réduction et valorisation des déchets' },
                    durabilityRepair: { type: "STRING", description: 'Impact sur l\'allongement de vie et la réparabilité' },
                  },
                  required: ['strategies', 'wasteValorization', 'durabilityRepair'],
                },
                regulationsAndNorms: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ['strengths', 'criticalRisks', 'lifecycleAssessment', 'circularEconomy', 'regulationsAndNorms'],
            },

            // 3. Aspects & impacts sociaux et sociétaux
            socialAspects: {
              type: "OBJECT",
              properties: {
                socialImpacts: { type: "ARRAY", items: { type: "STRING" }, description: 'Impacts sociaux directs : conditions de travail, hygiène et sécurité, santé des travailleurs et des riverains' },
                localEconomy: { type: "STRING", description: 'Impacts économiques locaux : création d\'emplois durables, circuits courts et retombées sur le bassin territorial' },
                governanceAndEthics: { type: "STRING", description: 'Impacts sociétaux et gouvernance éthique : concertation des parties prenantes, transparence et respect des normes RSE (ISO 26000)' },
                justTransition: { type: "STRING", description: 'Impacts sur la transition juste : formation continue aux métiers verts, inclusion et reconversion équitable des collaborateurs' },
              },
              required: ['socialImpacts', 'localEconomy', 'governanceAndEthics', 'justTransition'],
            },

            // 4. Intégration de l'entrepreneuriat vert
            greenEntrepreneurshipIntegration: {
              type: "OBJECT",
              properties: {
                differentiationFactor: { type: "STRING" },
                circularValueProposition: { type: "STRING" },
                circularArchetype: { type: "STRING", description: 'Archétype circulaire dominant (ex: Économie de la fonctionnalité, boucle fermée, etc.)' },
                competitiveMoat: { type: "STRING", description: 'Barrière à l\'entrée écologique et avantage concurrentiel durable' },
                iso59000Compliance: { type: "STRING", description: 'Conformité au cadre normatif ISO 59004/59010/59020' },
                environmentalAssets: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: 'Atouts environnementaux majeurs vérifiables intrinsèques au modèle',
                },
                improvementAxes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      axis: { type: "STRING", description: 'Intitulé de l\'axe d\'amélioration' },
                      lever: { type: "STRING", description: 'Levier opérationnel d\'éco-transition' },
                      environmentalGain: { type: "STRING", description: 'Gain environnemental mesurable chiffré' },
                      economicPayoff: { type: "STRING", description: 'Retombée économique ou délai de retour sur investissement' },
                      priority: { type: "STRING", description: 'Niveau de priorité : Stratégique, Haute ou Moyenne' },
                    },
                    required: ['axis', 'lever', 'environmentalGain', 'economicPayoff'],
                  },
                  description: 'Axes d\'amélioration prioritaires et leviers d\'éco-transition',
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
                      paybackPeriod: { type: "STRING" },
                    },
                    required: ['title', 'description', 'feasibility', 'economicBenefit'],
                  },
                },
                monetizationMechanisms: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      category: { type: "STRING" },
                      description: { type: "STRING" },
                      directCashFlowImpact: { type: "STRING" },
                    },
                    required: ['name', 'category', 'description', 'directCashFlowImpact'],
                  },
                },
                industrialSymbiosis: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      partner: { type: "STRING" },
                      fluxType: { type: "STRING" },
                      description: { type: "STRING" },
                      mutualBenefit: { type: "STRING" },
                    },
                    required: ['partner', 'fluxType', 'description', 'mutualBenefit'],
                  },
                },
                decouplingMetrics: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      indicator: { type: "STRING" },
                      targetValue: { type: "STRING" },
                      methodology: { type: "STRING" },
                    },
                    required: ['indicator', 'targetValue', 'methodology'],
                  },
                },
              },
              required: ['innovativeBusinessModels', 'differentiationFactor', 'circularValueProposition'],
            },






            // 5. Alignement ODD
            sdgAlignment: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  oddNumber: { type: "INTEGER", description: 'Numéro de l\'ODD (ex: 12)' },
                  title: { type: "STRING", description: 'Titre de l\'ODD' },
                  level: { type: "STRING", enum: ['Majeur', 'Secondaire'], description: 'Niveau de contribution : Majeur (cœur de métier / direct) ou Secondaire (transverse)' },
                  contribution: { type: "STRING", description: 'Contribution concrète et opérationnelle du projet' },
                  targets: { type: "ARRAY", items: { type: "STRING" }, description: 'Sous-cibles ODD succinctes' },
                  targetsDetail: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        code: { type: "STRING", description: 'Code de la sous-cible ONU (ex: 12.5)' },
                        title: { type: "STRING", description: 'Intitulé officiel de la sous-cible' },
                        indicator: { type: "STRING", description: 'Indicateur officiel ONU (ex: Indicateur ONU 12.5.1)' },
                        targetKpi: { type: "STRING", description: 'Objectif chiffré / KPI cible' },
                      },
                      required: ['code', 'title'],
                    },
                    description: 'Détail technique des sous-cibles ONU',
                  },
                  kpis: { type: "ARRAY", items: { type: "STRING" }, description: 'Indicateurs clés de performance suivis' },
                  dnshAssessment: { type: "STRING", description: 'Analyse Do No Significant Harm (Absence de préjudice important sur les autres ODD)' },
                  griStandards: { type: "ARRAY", items: { type: "STRING" }, description: 'Correspondance standards GRI' },
                  csrdEsrs: { type: "STRING", description: 'Norme CSRD/ESRS associée' },
                },
                required: ['oddNumber', 'title', 'contribution', 'targets'],
              },
            },

            // 6. Indicateurs d'impact
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
                        commentary: { type: "STRING" },
                      },
                      required: ['industryAverageKgCO2e', 'ecoDesignedTargetKgCO2e', 'commentary'],
                    },
                    lifecycleStages: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          id: { type: "STRING" },
                          name: { type: "STRING" },
                          category: {
                            type: "STRING",
                            enum: ['raw_materials', 'manufacturing', 'packaging', 'transport', 'usage', 'end_of_life'],
                          },
                          emissionKgCO2e: { type: "NUMBER" },
                          percentage: { type: "NUMBER" },
                          description: { type: "STRING" },
                          reductionOpportunity: { type: "STRING" },
                        },
                        required: ['id', 'name', 'category', 'emissionKgCO2e', 'percentage', 'description', 'reductionOpportunity'],
                      },
                    },
                    highImpactDecarbonizationActions: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          action: { type: "STRING" },
                          estimatedReductionPct: { type: "NUMBER" },
                          priority: { type: "STRING", enum: ['P1', 'P2', 'P3'] },
                        },
                        required: ['action', 'estimatedReductionPct', 'priority'],
                      },
                    },
                  },
                  required: ['functionalUnit', 'totalCarbonKgCO2e', 'benchmarkComparison', 'lifecycleStages', 'highImpactDecarbonizationActions'],
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
                      interpretation: { type: "STRING" },
                    },
                    required: ['label', 'value', 'unit', 'interpretation'],
                  },
                },
              },
              required: ['carbonFootprint', 'circularityRate', 'wasteAvoided', 'waterPreservation', 'localJobsProjection', 'keyMetrics'],
            },

            // 7. Financements et labels verts envisageables
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
                      eligibilityCriteria: { type: "STRING" },
                    },
                    required: ['name', 'category', 'whyItMatters', 'eligibilityCriteria'],
                  },
                },
                fundings: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      source: { type: "STRING" },
                      program: { type: "STRING" },
                      amountOrAid: { type: "STRING" },
                      conditions: { type: "STRING" },
                    },
                    required: ['source', 'program', 'amountOrAid', 'conditions'],
                  },
                },
              },
              required: ['labels', 'fundings'],
            },

            // 8. Plan d'action prioritaire
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
                      priorityLevel: { type: "STRING", enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: "STRING" },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
                phase2_3to6months: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      timeframe: { type: "STRING" },
                      title: { type: "STRING" },
                      description: { type: "STRING" },
                      priorityLevel: { type: "STRING", enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: "STRING" },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
                phase3_6to12months: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      timeframe: { type: "STRING" },
                      title: { type: "STRING" },
                      description: { type: "STRING" },
                      priorityLevel: { type: "STRING", enum: ['Haute', 'Moyenne', 'Stratégique'] },
                      expectedDeliverable: { type: "STRING" },
                    },
                    required: ['timeframe', 'title', 'description', 'priorityLevel', 'expectedDeliverable'],
                  },
                },
              },
              required: ['phase1_0to3months', 'phase2_3to6months', 'phase3_6to12months'],
            },
          },
          required: [
            'projectSynthesis',
            'environmentalAspects',
            'socialAspects',
            'greenEntrepreneurshipIntegration',
            'sdgAlignment',
            'impactIndicators',
            'greenFinancingAndLabels',
            'priorityActionPlan',
          ],
        },
          },
        }),
        signal: controller.signal,
      });
      const payload: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload?.error?.message || `Gemini HTTP ${response.status}`;
        if ([400, 401, 403].includes(response.status)) break;
        continue;
      }
      const text = (payload?.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('').trim();
      if (!text) {
        lastError = `Réponse Gemini vide (${payload?.candidates?.[0]?.finishReason || 'sans motif'}).`;
        continue;
      }
      let parsed: any;
      try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()); }
      catch { lastError = 'Gemini a retourné un JSON invalide.'; continue; }
      if (parsed?.needsInfo === true) return { parsed, model };
      const required = ['projectSynthesis','environmentalAspects','socialAspects','greenEntrepreneurshipIntegration','sdgAlignment','impactIndicators','greenFinancingAndLabels','priorityActionPlan'];
      if (!parsed || required.some((key) => parsed[key] == null) || !parsed.projectSynthesis?.scores) {
        lastError = 'La réponse Gemini ne respecte pas le schéma complet des huit sections.';
        continue;
      }
      return { parsed, model };
    } catch (error: any) {
      lastError = error?.name === 'AbortError' ? 'Délai maximal de génération Gemini dépassé.' : (error?.message || 'Connexion Gemini impossible.');
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastError);
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let body: any;
  try { body = await request.json(); }
  catch { return respond({ success: false, error: 'Format de requête JSON invalide.' }, 400); }

  const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails, fullDocumentContent } = body || {};
  if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
    return respond({ success: false, error: 'Le titre et la description du projet sont obligatoires.' }, 400);
  }
  const apiKey = env?.GEMINI_API_KEY?.trim();
  if (!apiKey) return respond({ success: false, error: '[Mode STRICT_IA] Clé GEMINI_API_KEY non configurée sur Cloudflare. Aucun diagnostic déterministe ne sera produit.', code: 'GEMINI_KEY_MISSING' }, 503);

    const systemPrompt = `
LANGUE OBLIGATOIRE : Tout le rapport d'expertise, les analyses, les synthèses, les arguments, les modèles d'affaires, les ODD, les indicateurs et les plans d'action DOIVENT IMPÉRATIVEMENT être rédigés en langue française irréprochable, professionnelle et scientifique.

Tu es le Collège d'Évaluation Environnementale de Vert'Idée.
Ta mission repose sur les méthodologies de référence internationales et nationales (ISO 14067:2018, ISO 14064-1:2018, Bibliothèque GreenGate.tn, Greenov'i, CITET, ANME, et Panorama des Méthodes d'Évaluation Environnementale - Institut Agro Montpellier / HAL) :
- **ISO 14067:2018 (Empreinte Carbone des Produits - ECP / CFP)** :
  * Quantification de l'empreinte carbone sur l'ensemble du cycle de vie (du berceau à la tombe ou du berceau à la porte) rapportée à une Unité Fonctionnelle (UF) ou déclarée rigoureuse.
  * Traitement distinct et transparent du carbone biogénique (émissions et captations de la biomasse) et des émissions liées au changement direct d'affectation des sols (dLUC) sur 20 ans.
  * Application conjointe des approches géographique (location-based) et contractuelle (market-based) pour l'électricité importée.
  * **Règle absolue anti-greenwashing ISO 14067** : La compensation carbone (achats de crédits, offsets) n'est JAMAIS déduite de l'empreinte carbone intrinsèque du produit.
- **ISO 14064-1:2018 (Inventaire des émissions et suppressions de GES au niveau des organismes)** :
  * Structuration selon les 6 catégories normatives :
    - Catégorie 1 : Émissions et captations directes de GES (combustions fixes, mobiles, procédés, émissions fugitives, UTCATF/LULUCF).
    - Catégorie 2 : Émissions indirectes de GES liées à l'énergie importée (électricité, vapeur, chaleur, froid).
    - Catégorie 3 : Émissions indirectes liées aux transports (fret amont/aval, mobilité collaborateurs, déplacements professionnels).
    - Catégorie 4 : Émissions indirectes des produits achetés (matières premières, emballages, biens d'équipement, traitement des déchets, services).
    - Catégorie 5 : Émissions indirectes associées à l'utilisation et la fin de vie des produits de l'organisme.
    - Catégorie 6 : Émissions indirectes d'autres sources.
  * Principes directeurs d'intégrité : Pertinence, Exhaustivité, Cohérence, Exactitude, Transparence.
- **Référentiel GreenGate.tn & Greenov'i (UE / Expertise France / CITET)** : Guide de l'Entrepreneuriat Vert, élaboration du Business Plan Vert, éco-conception, modèles d'affaires circulaires et critères d'éligibilité aux écolabels et financements verts (FODEP, ANME, BERD Climat).
- **ISO 14001 & ISO 14040/14044 (ACV)** : Analyse des Aspects Environnementaux Significatifs (AES) et évaluation multi-critères du cycle de vie du berceau à la tombe.
- **Guide & Panorama Institut Agro Montpellier** : Cadrage méthodologique combinant ACV (Life Cycle Assessment), GHG Protocol (Scopes 1-2-3), MFA (Analyse des Flux de Matière/Circularité), ERA (Évaluation des Risques Écotoxiques & Chimiques), AMC/MCDA (Analyse Multicritère de Décision Environnement-Économie-Social) et MEA/IPBES (Valuation des Services Écosystémiques).
- **Cadre des 17 ODD et 169 cibles de l'Agenda 2030 (ONU / Pacte Mondial - Réseau France)** : Évaluation rigoureuse et multi-acteurs de la contribution des projets aux Objectifs de Développement Durable, en s'appuyant sur les sous-cibles spécifiques et les indicateurs d'impact normés.

*** OBLIGATION D'ANALYSE DÉTAILLÉE DU CONTENU DES DOCUMENTS IMPORTÉS ***
Si la requête contient la rubrique 'CONTENU INTÉGRAL ET EXHAUSTIF DES DOCUMENTS IMPORTÉS (PDF, Word, Excel, Images JPG/PNG)', le Collège des 4 Experts DOIT impérativement fonder son audit (scores d'impacts, ACV, bilan carbone, ODD, risques) sur l'ENSEMBLE des données chiffrées, techniques, logistiques et financières contenues dans ce texte intégral, et non pas uniquement sur la description synthétique. L'analyse doit tirer pleinement parti de toutes les précisions opérationnelles fournies dans ces documents joints.

*** RÈGLE ABSOLUE D'ISOLATION ET D'INDÉPENDANCE DE L'AUDIT DE PROJET (AUCUN CACHE DE COHÉRENCE) ***
1. INDÉPENDANCE ABSOLUE DES ANCIENS PROJETS : Chaque audit est réalisé de manière 100% autonome, dynamique et isolée sans aucun cache de cohérence ni mémoire intermédiaire. L'analyse, les 8 sections, les scores et les modèles circulaires DOIVENT découler EXCLUSIVEMENT et directement des données transmises DANS LA PRÉSENTE REQUÊTE.
2. INTERDICTION STRICTE DE CONFUSION INTER-PROJETS : Il est strictement interdit d'injecter, de mélanger ou d'associer des données, procédés, produits ou termes issus d'autres projets ou sessions d'analyse précédentes.
3. INDÉPENDANCE TOTALE VIS-À-VIS DU NOM / MARQUE : L'évaluation environnementale et les scores (environnemental, social, circularité, maturité carbone et score global) reposent EXCLUSIVEMENT et STRICTEMENT sur la nature des activités réelles, les intrants, les procédés de fabrication ou de service, les flux de matière et d'énergie, et les externalités décrits dans la DESCRIPTION et les DOCUMENTS IMPORTÉS ACTUELS.
4. Le titre commercial ou nom de marque (ex: "grandii", "t3allem", ou tout autre libellé) n'est qu'un identifiant administratif. Il NE DOIT EN AUCUN CAS biaiser les scores ni l'analyse d'impact.

*** RÈGLE DE JUSTIFICATION TECHNIQUE ET SOURÇAGE (OBLIGATION DE TRAÇABILITÉ) ***
Chaque conclusion, score, avis d'expert ou affirmation technique émis par le Collège des Experts DOIT impérativement être justifié par une référence explicite aux données fournies.
Pour toute analyse ou score, l'expert doit inclure la mention : "[Source : (Description ou Document)] : [Référence précise]" (ex: "Score circularité 80/100 [Source : Document 1, page 2] : Le procédé de cuisson valorise 100% des résidus de gypse").
Toute affirmation non sourcée par une donnée explicite du projet est un manquement grave à l'intégrité technique.

1. ANALYSE PRÉLIMINAIRE : Vérifie si les informations fournies (titre, description, lieu, documents joints) sont suffisantes pour réaliser un audit environnemental complet ET crédible.
   - SI INSUFFISANT (notamment pour les projets industriels lourds, plasturgie, chimie, mines, sans détails sur les intrants, l'énergie ou les effluents) : Tu DOIS impérativement répondre avec { "needsInfo": true, "questions": [{ "id": "...", "question": "...", "options": [...] }] }.
   - Pose entre 3 et 5 questions à choix multiples pertinentes pour lever les doutes sur le greenwashing (ex: provenance de la matière, type d'énergie, consommation d'eau et circuit de recyclage).

2. ANALYSE DÉTAILLÉE : Si suffisant, tu es constitué de QUATRE Experts Seniors Indépendants réalisant une revue critique sans la moindre complaisance, couvrant exhaustivement tous les volets du projet :
   - **Expert 1 (Spécialiste Senior Empreinte Carbone & ACV - Normes ISO 14067:2018, ISO 14064-1:2018, GHG Protocol & MFA Institut Agro)** : Quantification normée de l'Empreinte Carbone Produit (ECP) par unité fonctionnelle ou déclarée (ISO 14067), décomposition rigoureuse selon les 6 catégories d'émissions ISO 14064-1 (Cat 1 directe, Cat 2 énergie importée, Cat 3 transport, Cat 4 intrants/emballages, Cat 5 usage/fin de vie), comptabilisation séparée du carbone biogénique et exclusion stricte de toute compensation carbone fictive.
   - **Expert 2 (Risques Industriels, Écotoxicologie ERA & AES ISO 14001 - Guide OSS & Institut Agro)** : Évaluation de la criticité des impacts selon la matrice normée **Criticité (C) = [Fréquence (F) × Gravité (G) × Sensibilité du Milieu (S)] / Maîtrise Opérationnelle (M)**, l'évaluation des risques écotoxiques (ERA), le stress hydrique (OSS), la santé des riverains et la conformité réglementaire (CITET, CSRD, Taxonomie UE).
   - **Expert 3 (Expert Senior en Entrepreneuriat Vert & Modèles Circulaires - Master 2 / Doctorat, >10 ans d'expérience dans le conseil RSE & incubation)** : Pilote la structuration des modèles d'affaires circulaires (écoconception, économie de la fonctionnalité PaaS, écologie industrielle & symbioses territoriales, gestion/valorisation des déchets, réemploi 9R), la modélisation financière et viabilité économique, le suivi-évaluation (M&E) des KPI d'impacts (tonnes CO2 évitées, déchets valorisés, emplois verts), et l'ingénierie financière pour l'accès aux financements verts (ANME/FTE, SwitchMed, FODEP, BERD Climat, capital-risque vert & fonds à impact).
   - **Expert 4 (Détecteur Avancé Anti-Greenwashing & Vérification des Allégations)** : Chasse implacable aux revendications environnementales trompeuses (greenwashing), analyse critique de la matérialité des gains annoncés face aux impacts cachés (amont/aval), exigence de preuves mesurables (ACV certifiée, traçabilité des intrants, labels authentiques).

*** RÈGLE ÉTHIQUE & SÉCURITÉ ABSOLUE : TOLÉRANCE ZÉRO AU GREENWASHING ***
1. Projets interdits : Si le projet porte sur des technologies militaires, des armes ou des substances destructrices illégales, refuse catégoriquement l'audit.
2. ÉVALUATION RÉALISTE DES ACTIVITÉS POLLUANTES, EXTRACTIVES & EXTRACTIVO-CHIMIQUES :
   Si le projet décrit appartient à une industrie lourde extractive, minière, fossile, plasturgie conventionnelle ou hyper-consommatrice d'eau (ex : phosphate, carrières, cimenterie fossile, pétrochimie, engrais de synthèse, pesticides, injection plastique sans 100% de résine recyclée certifiée) :
   - TU DOIS STATUER UN AVIS DÉFAVORABLE / ALERTE CRITIQUE DU COLLÈGE DES EXPERTS.
   - Les scores d'impact DOIVENT ÊTRE CRITIQUEMENT BAS : Score global entre 15 et 32/100, Score environnemental entre 12 et 25/100, Score circularité entre 10 et 22/100.
   - IL EST STRICTEMENT INTERDIT de prétendre que ce projet est "vertueux", "éco-responsable" ou relève de l'"économie circulaire" sans preuves massives (ex: circuit fermé eau ZLD, 100% recyclé certifié, solaire dédié).
   - DÉTAILLE EXPLICITEMENT LES AES MAJEURS ET LES RISQUES CRITIQUES RÉELS (Pollution nappes, poussières PM10, sur-émissions CO2).
3. PROJETS CONVENTIONNELS : Attribue des notes réalistes, cohérentes et modérées (40 à 70/100 pour l'environnement). Si le projet présente des pratiques traditionnelles (ex: huilerie), il doit être évalué sur sa gestion réelle des déchets (margines) et de l'énergie, sans surévaluer le caractère 'traditionnel' comme une innovation écologique intrinsèque.
4. VRAIES ÉCO-INNOVATIONS VÉRIFIABLES (Agroécologie régénératrice, biomatériaux compostables, énergies renouvelables certifiées, valorisation circulaire de biodéchets) : Attribue des scores élevés (75 à 90/100) UNIQUEMENT si le projet démontre une rupture écologique significative et mesurable, avec justification des gains nets et de la résilience locale (Guide OSS).

Le rapport d'expertise DOIT OBLIGATOIREMENT être structuré selon EXACTEMENT les 8 sections officielles :
1. Synthèse du projet : Scores d'impacts rigoureusement calibrés (sévères si polluant), avis collégial des experts (STRICTEMENT LIMITÉ À 5 LIGNES MAX / ~40-50 mots directement après le nom du projet) et vision de transformation.
   - NOTE IMPORTANTE SUR LE 'SCORE ENVIRONNEMENTAL GLOBAL' : Ce score DOIT intégrer l'évaluation de l'IA elle-même si elle est au cœur du projet. Le Collège des Experts doit justifier si l'IA utilisée est frugale (modèle adapté, usage nécessaire, hébergement sobre) et si le bénéfice environnemental démontrable du projet dépasse l'empreinte carbone et les ressources consommées par l'entraînement et l'inférence de l'IA (principe du bilan net positif). L'usage de l'IA sans besoin précis ou sans gain environnemental supérieur aux coûts (énergie, eau, métaux) doit réduire ce score.
2. Aspects & impacts environnementaux : Analyse approfondie des aspects et impacts environnementaux (directs et indirects, positifs et négatifs) sur les écosystèmes, l'air, l'eau, le climat, les sols et la biodiversité. Évaluation normée des AES selon la matrice ISO 14001 (F, G, S, M), quantification des impacts par phase du cycle de vie (ACV ISO 14040/14044), écotoxicité (ERA), flux de matière (MFA) et leviers d'atténuation d'impacts.
3. Aspects & impacts sociaux et sociétaux : Analyse approfondie des impacts sociaux et sociétaux directs et indirects : santé et sécurité des travailleurs, santé publique et riverains (exposition poussières PM, produits toxiques, bruit), création d'emplois locaux pérennes, retombées communautaires, gouvernance partagée éthique (ISO 26000) et accompagnement vers une transition juste.
4. Intégration de l'entrepreneuriat vert (Pilôté par l'Expert Senior en Entrepreneuriat Vert & Modèles Circulaires - Master 2/Doctorat, >10 ans d'exp.) : Analyse économique critique, viabilité financière, ingénierie d'accès aux financements verts (ANME, SwitchMed, BERD, FODEP, fonds climat), suivi-évaluation M&E des KPI d'impacts, et structuration des modèles de rupture circulaires (normes ISO 59004:2024 / ISO 59020 / Cadre 9R / EFC / CSRD ESRS E5).
   - RÈGLE ABSOLUE D'ALIGNEMENT SECTORIEL & ANTI-CONFUSION : La Section 4 DOIT correspondre STRICTEMENT, EXCLUSIVEMENT et SANS LA MOINDRE AMBIGUÏTÉ aux activités, produits, services, intrants et procédés réels décrits dans la description et les documents importés du projet.
     * Pour tout projet numérique, EdTech, intelligence artificielle, formation, application ou SaaS (ex: KidoraIA, plateformes pédagogiques, écosystèmes d'apprentissage) : les modèles circulaires, atouts et axes de progrès doivent porter sur le numérique responsable, l'éco-conception logicielle (RGESN, Green Code, réduction des requêtes et bande passante), l'allongement de la durée de vie des terminaux clients (reconditionné), l'hébergement cloud vert à faible PUE, et l'accessibilité universelle. IL EST STRICTEMENT INTERDIT de renvoyer des modèles d'eau, d'huile d'olive ou de semelles de chaussures !
     * Pour tout projet de chaussures de sécurité ou EPI : les modèles circulaires doivent porter sur le "Safety-Shoe-as-a-Service", l'injection directe sans COV et le recyclage PU/TPU.
     * Pour tout projet médical, orthopédique, pharmaceutique ou de matériel de santé (ex: fabrication de plâtre médical, bandes de plâtre orthopédique, dispositifs médicaux) : les modèles circulaires, atouts, ODD (ODD 3 Santé en Majeur, ODD 12 Production responsable) et indicateurs d'impact (unité fonctionnelle : 100 000 bandes / pièces médicales certifiées) doivent porter STRICTEMENT sur la fabrication industrielle du plâtre médical, la cuisson du gypse naturel local, le coulage sur gaze, la stérilisation médicale et la traçabilité ISO 13485 / ISO 14001. IL EST STRICTEMENT INTERDIT de renvoyer du Numérique Responsable, du software, du PUE, des chaussures ou des semelles !
     * Pour tout autre secteur (agriculture, emballage, textile, énergie, eau, chimie) : les modèles circulaires, atouts et axes de progrès doivent découler directement des spécificités du projet.
   - Renseigner impérativement les ATOUTS ENVIRONNEMENTAUX MAJEURS (éco-avantages compétitifs vérifiables et intrinsèques du modèle) ainsi que les AXES D'AMÉLIORATION PRIORITAIRES & LEVIERS D'ÉCO-TRANSITION (avec levier opérationnel concret, gain environnemental mesuré chiffré, impact économique/ROI et niveau de priorité : 'Stratégique', 'Haute', 'Moyenne').
5. Alignement ODD (Objectifs de Développement Durable - Méthodologie normée SDG Compass, ONU Agenda 2030, GRI & CSRD/ESRS) :
   - RÈGLE DE MATÉRIALITÉ & NIVEAU DE CONTRIBUTION : Distinguer rigoureusement les contributions 'Majeur' (cœur de métier / impact direct mesurable) des contributions 'Secondaire' (impact indirect / mesures transversales). Éviter le saupoudrage non justifié (tolérance zéro au SDG-washing).
   - CODES OFFICIELS ET INDICATEURS DE L'ONU : Pour chaque ODD retenu, renseigner impérativement les sous-cibles officielles (ex: 12.5, 13.2, 4.4, 6.4), les libellés de l'Agenda 2030, ainsi que l'indicateur officiel ONU associé (ex: 'Indicateur ONU 12.5.1 (Taux de valorisation matière)').
   - PRINCIPE DNSH (Do No Significant Harm / Non-nuisance importante) : Fournir pour chaque ODD une analyse DNSH garantissant que l'atteinte de cette cible ne cause aucun dommage disproportionné sur les autres écosystèmes (ex: consommation énergétique d'un service digital, recyclage batterie solaire, etc.).
   - KPI DE SUIVI ET STANDARDS GRI / CSRD : Spécifier au moins 1 KPI d'impact chiffrable et les liens normatifs pertinents (ex: GRI 302, GRI 303, GRI 305, GRI 306, ESRS E1, ESRS E5, ESRS S1).
   - RÈGLE IMPÉRATIVE POUR LES PROJETS EDTECH / ÉDUCATION : Pour tout projet relevant de l'éducation, de la formation, de l'EdTech, de l'inclusion (ex: enfants TSA, DYS) ou de la pédagogie, tu DOIS obligatoirement inclure l'**ODD 4 (Éducation de qualité)** en premier et au niveau 'Majeur' (avec les sous-cibles 4.1, 4.4, 4.5 et 4.7), complété par les ODD 10, 8 et 12.
6. Indicateurs d'impact : Bilan carbone normé selon ISO 14067:2018 (par unité fonctionnelle) et ISO 14064-1:2018 (Catégories 1 à 6). Analyse de cycle de vie étape par étape (Approvisionnement Cat 4, Fabrication Cat 1-2, Conditionnement Cat 4, Transport Cat 3, Utilisation Cat 5, Fin de vie Cat 5) avec exclusion stricte de toute compensation carbone fictive. Pour benchmarkComparison : si le projet appartient à une industrie lourde ou polluante, totalCarbonKgCO2e DOIT être STRICTEMENT SUPÉRIEUR à industryAverageKgCO2e (+20% à +60% de sur-émissions) ; si éco-innovation vertueuse, totalCarbonKgCO2e DOIT être INFÉRIEUR (-20% à -65%). Actions de décarbonation quantifiées (P1/P2/P3), intensité eau chiffrée.
7. Financements et labels verts : Statut d'éligibilité réel (exclusion formelle des labels verts si activité polluante), fonds de mise en conformité et dépollution (FODEP, BERD Climat).
8. Plan d'action prioritaire : Actions concrètes d'urgence (0-12 mois) priorisées avec livrables opérationnels pour la neutralisation des AES.
`;

    const userPrompt = `
Voici le projet à auditer selon les 8 sections officielles par le Collège des 4 Experts Environnementaux :
- Nom commercial / Marque du projet (Libellé administratif uniquement, NE DOIT PAS INFLUENCER LES SCORES) : ${title}
- Description synthétique de l'activité & Proposition de valeur : ${description}
- Lieu d'implantation : ${resolveLocation(location)}
${sector ? `- Secteur suggéré : ${sector}` : ''}
${targetAudience ? `- Cible suggérée : ${targetAudience}` : ''}
${businessModel ? `- Modèle économique suggéré : ${businessModel}` : ''}
${lifeCycleDetails ? `- Détails cycle de vie : ${lifeCycleDetails}` : ''}
${
  fullDocumentContent && typeof fullDocumentContent === 'string' && fullDocumentContent.trim().length > 30
    ? `
- CONTENU INTÉGRAL ET EXHAUSTIF DES DOCUMENTS IMPORTÉS (PDF, Word, Excel, Images JPG/PNG) À PRENDRE EN COMPTE DANS L'ANALYSE DÉTAILLÉE DES 4 EXPERTS :
"""
${fullDocumentContent.trim().slice(0, 50000)}
"""
(Note aux 4 Experts : Vous devez exploiter l'ensemble des données chiffrées, techniques, financières et écologiques contenues dans ces documents importés pour réaliser un audit ultra-précis, calibrer le bilan carbone et évaluer la conformité RSE/ODD).`
    : ''
}
${body && body.answers ? `- Informations complémentaires fournies (Q&R) : ${JSON.stringify(body.answers)}` : ''}

Consigne d'évaluation : Réalise un audit direct, indépendant et dynamique, exclusivement fondé sur la description et le contenu des documents fournis dans cette demande spécifique (sans aucun cache de cohérence ni contrainte d'alignement historique).
`;


  try {
    const discovery = await discoverGeminiModels(apiKey, env?.GEMINI_MODEL);
    if (!discovery.models.length) throw new Error(discovery.error || 'Aucun modèle Gemini accessible avec cette clé.');
    const { parsed, model } = await generateStrict(apiKey, discovery.models, systemPrompt, userPrompt);
    if (parsed.needsInfo === true) return respond({ success: true, needsInfo: true, questions: parsed.questions || [], aiMetadata: { provider: 'Google Gemini', model, mode: 'STRICT_IA' } });
    const auditResult = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      sector: parsed.detectedSector || sector || 'Économie Circulaire & Éco-innovation',
      description,
      location: resolveLocation(location),
      targetAudience: targetAudience || 'B2B / B2C Éco-responsable',
      businessModel: businessModel || 'Économie Circulaire & Vente directe',
      lifeCycleDetails: lifeCycleDetails || '',
      createdAt: new Date().toISOString(),
      ...parsed,
      aiMetadata: { provider: 'Google Gemini', model, mode: 'STRICT_IA', generatedAt: new Date().toISOString() },
    };
    return respond({ success: true, data: auditResult });
  } catch (error: any) {
    console.error('[Cloudflare STRICT_IA] Échec du diagnostic Gemini :', error?.message || error);
    return respond({ success: false, error: `[Mode STRICT_IA] Diagnostic non généré : ${error?.message || 'Erreur IA'}. Aucun fallback déterministe n'est autorisé.`, code: 'GEMINI_ANALYSIS_FAILED' }, 503);
  }
};
