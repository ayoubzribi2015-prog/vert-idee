import { discoverGeminiModels } from '../../src/utils/geminiModels.ts';
import {
  fetchContextualBaseCarboneFactors,
  BASE_CARBONE_VERSION,
  BASE_CARBONE_DOC_URL,
} from '../../src/utils/baseCarbone.ts';

type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };

async function callGeminiChat(
  apiKey: string,
  model: string,
  systemInstruction: string,
  contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const generationConfig = model.toLowerCase().startsWith('gemini-4')
      ? { maxOutputTokens: 3584, thinkingConfig: { thinkingLevel: 'LOW' } }
      : { temperature: 0.5, maxOutputTokens: 3584 };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        ...(generationConfig ? { generationConfig } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter((p: any) => p && typeof p.text === 'string' && !p.thought);
    const text = (textParts.length > 0 ? textParts : parts).map((p: any) => p?.text || '').join('');
    if (!text.trim()) {
      throw new Error('Réponse Gemini vide');
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

function getFallbackReply(message: string, projectContext?: any): string {
  return (
    `### Conseil de l'Éco-Conseiller Vert'Idée\n\n` +
    `Pour votre projet ${projectContext?.title ? `**« ${projectContext.title} »**` : 'd\'entrepreneuriat vert'},\n\n` +
    `Concernant votre demande : *« ${message} »* :\n\n` +
    `1. **Optimisation de l'empreinte & ACV :** Ciblez les postes les plus émetteurs dès la conception (matières bio-sourcées ou recyclées en circuits courts, réduction des consommations énergétiques).\n` +
    `2. **Partenaires & Pépinières :** Appuyez-vous sur les structures locales comme l'**APII** et le réseau des pépinières **RNPE** pour bénéficier d'un hébergement, d'un coaching et d'allègements fiscaux d'amorçage.\n` +
    `3. **Dispositifs de financement vert :** Explorez le Fonds de Transition Énergétique (**FTE / ANME**), les programmes de l'Union Européenne (**SwitchMed / Green Deal**) et les prêts d'honneur à impact.\n` +
    `4. **Labellisation & Crédibilité :** Préparez un dossier pour un label reconnu (**ISO 14001**, **B-Corp**, **Écolabel**) afin d'accélérer vos contrats B2B et justifier de votre impact environnemental réel.\n\n` +
    `*Note : Les serveurs de calcul IA centraux connaissent actuellement un pic passager de forte affluence (503), mais vos données et diagnostics demeurent 100% sécurisés et consultables.*`
  );
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: 'Requête JSON invalide.' }, { status: 400 });
    }

    const { message, history, projectContext } = body;
    if (!message || typeof message !== 'string') {
      return Response.json({ success: false, error: 'Message requis.' }, { status: 400 });
    }

    const chatBaseCarbone = await fetchContextualBaseCarboneFactors({
      title: projectContext?.title,
      sector: projectContext?.sector,
      description: `${message} ${projectContext?.description || ''}`,
      location: projectContext?.location,
      timeoutMs: 3500,
    });

    const systemInstruction = `Tu es un Expert Environnemental Senior avec plus de 20 ans d'expérience internationale dans le pilotage de projets industriels et écologiques complexes. Tu es reconnu pour ton intransigeance éthique, ta franchise absolue et ton évaluation sincère et sans concession des impacts écologiques réels (zéro greenwashing). Tu maîtrises parfaitement :
- **ISO 14001** : Méthodologie d'Analyse Environnementale et de hiérarchisation des Aspects Environnementaux Significatifs (AES) selon la matrice **Criticité = (Fréquence × Gravité × Sensibilité) / Maîtrise**.
- **Guide & Panorama Institut Agro Montpellier (HAL)** : Sélection et combinaison multi-méthodes d'évaluation environnementale : ACV multi-critères (ISO 14040/14044), Bilan Carbone (GHG Protocol Scopes 1-2-3), MFA (Analyse des Flux de Matière), ERA (Évaluation des Risques Écotoxiques), AMC/MCDA (Analyse Multicritère de Décision) et MEA/IPBES (Valuation des Services Écosystémiques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : Éco-responsabilité, préservation stricte des ressources en eau en milieu aride, lutte contre la dégradation des sols et résilience hydro-climatique.
- **Normes Internationales & Base Empreinte® / Base Carbone® ADEME** : CSRD, Taxonomie UE, ISO 14040/14044 (ACV), ISO 14067:2018 (ECP Produit), GHG Protocol (Scopes 1-2-3), référentiel officiel ADEME (${BASE_CARBONE_DOC_URL}, version figée ${BASE_CARBONE_VERSION} intégrée localement, sans repli réseau), lois AGEC/ESPR.

Ton expertise couvre :
1. **Évaluation Sincère des AES & Impacts Écologiques :** Analyse critique des cycles de vie, hiérarchisation normée des impacts (ISO 14001), identification des externalités négatives cachées, des risques de transfert de pollution et des véritables gains nets.
2. **Gestion de l'Eau & Résilience Aride (Directives OSS) :** Évaluation de la pression sur les nappes phréatiques, recyclage en boucle fermée ZLD (Zero Liquid Discharge), lutte contre l'érosion et valorisation éco-citoyenne.
3. **Transition Bas-Carbone & Critères ESG :** Comptabilité carbone (Scopes 1, 2, 3), calculs chiffrés appuyés sur les facteurs d'émission ADEME Base Carbone®, trajectoires SBTi, critères ESG et intégration extra-financière.
4. **Conformité Réglementaire Nationale et Internationale :** CSRD, taxonomie européenne, réglementations environnementales régionales (CITET, ANME, directives d'implantation).
5. **Pilotage de Projets & Financement Vert :** Structuration technique, plans de réduction d'urgence, ingénierie de financement vert (ADEME, Bpifrance, FODEP, BERD, Fonds Vert).

*** RÈGLE ÉTHIQUE & SÉCURITÉ ABSOLUE : ***
Si la question ou le projet abordé concerne des technologies militaires, des armes, des substances illicites, de la désinformation écologique ou toute activité ayant une finalité destructrice pour l'environnement ou l'humain, tu refuses catégoriquement et directement, en expliquant les raisons scientifiques et éthiques de ton refus.

${projectContext ? `
Contexte technique actuel du projet audité :
- Titre : ${projectContext.title || 'Non spécifié'}
- Lieu d'implantation : ${projectContext.location || 'Non spécifié'}
- Secteur : ${projectContext.sector || 'Non spécifié'}
- Description : ${projectContext.description || 'Non spécifié'}
- Scores d'impact : Environnement ${projectContext.projectSynthesis?.scores?.environmental ?? '--'}/100, Social ${projectContext.projectSynthesis?.scores?.social ?? '--'}/100, Circularité ${projectContext.projectSynthesis?.scores?.circularity ?? '--'}/100, Innovation & Faisabilité technique ${projectContext.projectSynthesis?.scores?.innovationFeasibility ?? projectContext.projectSynthesis?.scores?.carbonMaturity ?? '--'}/100, Global ${projectContext.projectSynthesis?.scores?.globalScore ?? '--'}/100
- Empreinte carbone produit : ${projectContext.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? '--'} kg CO2e / unité
` : ''}
${chatBaseCarbone.promptBlock ? `\n${chatBaseCarbone.promptBlock}\n` : ''}

Réponds en français avec un ton professionnel, direct, analytique et sans complaisance.

*** RÈGLES STRICTES DE FORMAT, PÉDAGOGIE ET LISIBILITÉ (OBLIGATOIRES) ***
1. **Équilibre clarté / profondeur** : Structure la réponse en sections distinctes et aérées (300 à 420 mots hors tableaux/graphiques).
2. **Structure visuelle obligatoire** :
   - \`### Synthèse\` : 2 à 3 lignes maximum répondant directement à la question.
   - \`### Analyse narrative approfondie\` : Un **paragraphe narratif fluide et détaillé** (5 à 7 phrases) développant le contexte, les mécanismes de cause à effet, les arbitrages techniques/financiers et les points de vigilance terrain.
   - \`### Tableau décisionnel\` : Tableau Markdown compact (3 à 5 lignes max) pour comparer options, leviers, risques ou financements.
   - **Graphique visuel intégré** : Dès qu'il existe des données chiffrées, scores ou comparatifs, insère 1 bloc JSON strict entouré de \`\`\`chart :
     \`\`\`chart
     {"type":"bar","title":"Titre court","unit":"%","items":[{"label":"Poste 1","value":45},{"label":"Poste 2","value":30}]}
     \`\`\`
   - \`### Prochaines étapes\` : 3 puces courtes et actionnables maximum.`;

    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        const txt = typeof item?.content === 'string' ? item.content : typeof item?.text === 'string' ? item.text : '';
        if (!txt.trim()) continue;
        const role = item.role === 'model' || item.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: txt }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const apiKey = env?.GEMINI_API_KEY?.trim();
    let reply: string | null = null;

    if (apiKey) {
      const candidates = (await discoverGeminiModels(apiKey, env?.GEMINI_MODEL)).models;
      for (const model of candidates) {
        try {
          reply = await callGeminiChat(apiKey, model, systemInstruction, contents);
          if (reply) break;
        } catch (chatErr) {
          console.warn(`[Cloudflare Chat] Modèle ${model} échoué :`, chatErr);
        }
      }
    }

    if (!reply) {
      return Response.json({
        success: false,
        error: `[Mode STRICT_IA] L'assistant n'a pas pu répondre : Le modèle IA est indisponible. Conformément au Mode STRICT_IA, aucun fallback n'est autorisé.`,
      }, { status: 503 });
    }

    return Response.json({ success: true, reply });
  } catch (err: any) {
    console.error('[Mode STRICT_IA] Error in /api/chat:', err);
    return Response.json({
      success: false,
      error: `[Mode STRICT_IA] L'assistant n'a pas pu répondre : ${err?.message || 'Erreur IA'}. Conformément au Mode STRICT_IA, aucun fallback n'est autorisé.`,
    }, { status: 503 });
  }
};
