// Proxy Gemini sécurisé (Cloudflare Pages Function) : POST /api/generate
// La clé GEMINI_API_KEY reste dans les secrets Cloudflare et n'est jamais exposée au navigateur.

type Context = {
  request: Request;
  env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
};

const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const MAX_BODY_BYTES = 200_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

const respond = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const apiKey = env?.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return respond({ error: 'API key not configured on server' }, 500);
  }

  // Refuse les appels cross-origin : seul le frontend du même site peut utiliser le proxy.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return respond({ error: 'Origin not allowed' }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return respond({ error: 'Request body too large' }, 413);
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400);
  }

  if (!Array.isArray(body?.contents) || body.contents.length === 0) {
    return respond({ error: 'Field "contents" is required' }, 400);
  }

  // Seuls ces champs sont relayés ; le modèle est choisi côté serveur uniquement.
  const payload: Record<string, unknown> = { contents: body.contents };
  if (body.systemInstruction) payload.systemInstruction = body.systemInstruction;
  if (body.generationConfig) payload.generationConfig = body.generationConfig;

  const models = env.GEMINI_MODEL?.trim() ? [env.GEMINI_MODEL.trim(), ...DEFAULT_MODELS] : DEFAULT_MODELS;
  let lastStatus = 502;
  let lastError = 'Upstream error';

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      if (upstream.ok) {
        return respond(await upstream.json());
      }

      lastStatus = upstream.status;
      lastError = `Gemini HTTP ${upstream.status}`;
      // Erreurs client (400/401/403) : inutile d'essayer un autre modèle.
      if (upstream.status < 500 && upstream.status !== 404 && upstream.status !== 429) break;
    } catch (err: any) {
      lastStatus = err?.name === 'AbortError' ? 504 : 502;
      lastError = err?.name === 'AbortError' ? 'Upstream timeout' : 'Upstream unreachable';
    } finally {
      clearTimeout(timer);
    }
  }

  return respond({ error: lastError }, lastStatus);
};
