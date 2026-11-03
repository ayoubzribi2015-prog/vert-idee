export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY non configurée sur le serveur Cloudflare" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const modelName = body.model || "gemini-1.5-pro"; // Ajustez selon votre modèle AI Studio

    const formatContents = (raw) => {
      if (typeof raw === 'string') return [{ role: 'user', parts: [{ text: raw }] }];
      if (Array.isArray(raw)) {
        if (raw.length === 0) return [{ role: 'user', parts: [{ text: '' }] }];
        if (raw.every((i) => i && typeof i === 'object' && Array.isArray(i.parts))) return raw;
        if (raw.every((i) => typeof i === 'string' || (i && (i.text !== undefined || i.inlineData !== undefined)))) {
          return [{ role: 'user', parts: raw.map((i) => (typeof i === 'string' ? { text: i } : i)) }];
        }
        return raw.map((i) => (typeof i === 'string' ? { role: 'user', parts: [{ text: i }] } : i));
      }
      if (typeof raw === 'object' && Array.isArray(raw.parts)) return [raw];
      return [{ role: 'user', parts: [{ text: String(raw) }] }];
    };

    const formatSystem = (raw) => {
      if (!raw) return undefined;
      if (typeof raw === 'string') return { parts: [{ text: raw }] };
      if (typeof raw === 'object' && Array.isArray(raw.parts)) return raw;
      return { parts: [{ text: String(raw) }] };
    };

    const payload = {
      contents: formatContents(body.contents),
      generationConfig: body.generationConfig || {}
    };
    const formattedSys = formatSystem(body.systemInstruction);
    if (formattedSys) payload.systemInstruction = formattedSys;

    // Appel sécurisé vers l'API officielle Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
