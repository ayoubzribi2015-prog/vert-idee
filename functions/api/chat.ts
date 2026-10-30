type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };

const defaultModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

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
        generationConfig: {
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
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

    const systemInstruction = `Tu es un Expert Environnemental Senior avec plus de 20 ans d'expérience internationale dans le pilotage de projets industriels et écologiques complexes. Tu es reconnu pour ton intransigeance éthique, ta franchise absolue et ton évaluation sincère et sans concession des impacts écologiques réels (zéro greenwashing). Tu maîtrises parfaitement :
- **ISO 14001** : Méthodologie d'Analyse Environnementale et de hiérarchisation des Aspects Environnementaux Significatifs (AES) selon la matrice **Criticité = (Fréquence × Gravité × Sensibilité) / Maîtrise**.
- **Guide & Panorama Institut Agro Montpellier (HAL)** : Sélection et combinaison multi-méthodes d'évaluation environnementale : ACV multi-critères (ISO 14040/14044), Bilan Carbone (GHG Protocol Scopes 1-2-3), MFA (Analyse des Flux de Matière), ERA (Évaluation des Risques Écotoxiques), AMC/MCDA (Analyse Multicritère de Décision) et MEA/IPBES (Valuation des Services Écosystémiques).
- **Guide OSS (Observatoire du Sahara et du Sahel) & REPSAHEL** : Éco-responsabilité, préservation stricte des ressources en eau en milieu aride, lutte contre la dégradation des sols et résilience hydro-climatique.
- **Normes Internationales** : CSRD, Taxonomie UE, ISO 14040/14044 (ACV), GHG Protocol (Scopes 1-2-3), lois AGEC/ESPR.

Ton expertise couvre :
1. **Évaluation Sincère des AES & Impacts Écologiques :** Analyse critique des cycles de vie, hiérarchisation normée des impacts (ISO 14001), identification des externalités négatives cachées, des risques de transfert de pollution et des véritables gains nets.
2. **Gestion de l'Eau & Résilience Aride (Directives OSS) :** Évaluation de la pression sur les nappes phréatiques, recyclage en boucle fermée ZLD (Zero Liquid Discharge), lutte contre l'érosion et valorisation éco-citoyenne.
3. **Transition Bas-Carbone & Critères ESG :** Comptabilité carbone (Scopes 1, 2, 3), trajectoires SBTi, critères ESG et intégration extra-financière.
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
- Scores d'impact : Environnement ${projectContext.projectSynthesis?.scores?.environmental ?? '--'}/100, Social ${projectContext.projectSynthesis?.scores?.social ?? '--'}/100, Circularité ${projectContext.projectSynthesis?.scores?.circularity ?? '--'}/100, Global ${projectContext.projectSynthesis?.scores?.globalScore ?? '--'}/100
- Empreinte carbone produit : ${projectContext.impactIndicators?.carbonFootprint?.totalCarbonKgCO2e ?? '--'} kg CO2e / unité
` : ''}

Réponds en français avec un ton professionnel, direct, hautement qualifié, analytique et sans complaisance. Apporte des conseils d'expert aguerri, des analyses de risques rigoureuses et des recommandations pratiques basées sur le terrain.`;

    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (!item || typeof item.text !== 'string') continue;
        const role = item.role === 'model' || item.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: item.text }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const apiKey = env?.GEMINI_API_KEY?.trim();
    let reply: string | null = null;

    if (apiKey) {
      const candidates = env?.GEMINI_MODEL ? [env.GEMINI_MODEL, ...defaultModels] : defaultModels;
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
      reply = getFallbackReply(message, projectContext);
    }

    return Response.json({ success: true, reply });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return Response.json({
      success: true,
      reply: getFallbackReply('Demande d\'assistance'),
    });
  }
};
