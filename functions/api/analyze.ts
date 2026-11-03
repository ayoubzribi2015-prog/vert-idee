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
      'Cache-Control': 'no-store',
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

NOTE SUR LE SCORE ENVIRONNEMENTAL GLOBAL : Ce score DOIT intégrer l'évaluation de l'IA si elle est au cœur du projet (frugalité, bilan net positif supérieur aux coûts de calcul, eau, électricité).

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
    const timer = setTimeout(() => controller.abort(), 120000);

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
