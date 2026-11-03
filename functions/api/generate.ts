// Proxy Gemini sécurisé (Cloudflare Pages Function) : POST /api/generate
// La clé GEMINI_API_KEY reste dans les secrets Cloudflare et n'est jamais exposée au navigateur.

import { discoverGeminiModels } from '../../src/utils/geminiModels.ts';

type Context = {
  request: Request;
  env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
};

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

  if (!body?.contents) {
    return respond({ error: 'Field "contents" is required' }, 400);
  }

  const formatContents = (raw: any): any[] => {
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

  const formatSystem = (raw: any): any => {
    if (!raw) return undefined;
    if (typeof raw === 'string') return { parts: [{ text: raw }] };
    if (typeof raw === 'object' && Array.isArray(raw.parts)) return raw;
    return { parts: [{ text: String(raw) }] };
  };

  // Seuls ces champs sont relayés ; le modèle est choisi côté serveur uniquement.
  const payload: Record<string, unknown> = { contents: formatContents(body.contents) };
  const systemInstruction = formatSystem(body.systemInstruction);
  if (systemInstruction) payload.systemInstruction = systemInstruction;
  if (body.generationConfig) payload.generationConfig = body.generationConfig;

  const models = (await discoverGeminiModels(apiKey, env.GEMINI_MODEL)).models;
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
