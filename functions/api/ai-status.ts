// Diagnostic IA : indique si la clé est configurée et quels modèles Gemini sont accessibles.
// Ne renvoie jamais la clé. Ajouter ?probe=1 pour tester un vrai appel generateContent.
import { discoverGeminiModels } from '../../src/utils/geminiModels.ts';

type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  const headers = { 'Cache-Control': 'no-store' };
  const base = { success: true, runtime: 'cloudflare-pages', service: 'vert-idee-api' };
  const apiKey = env?.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      { ...base, geminiKeyConfigured: false, hint: 'Ajoutez le secret GEMINI_API_KEY dans Cloudflare Pages (Production et Preview) puis redéployez.' },
      { headers }
    );
  }

  const discovery = await discoverGeminiModels(apiKey, env.GEMINI_MODEL);
  const out: Record<string, unknown> = {
    ...base,
    geminiKeyConfigured: true,
    modelSource: discovery.source,
    listModelsStatus: discovery.listModelsStatus,
    models: discovery.models,
    error: discovery.error,
  };

  if (new URL(request.url).searchParams.get('probe') === '1') {
    const model = discovery.models[0];
    if (!model) {
      out.probe = { ok: false, message: discovery.error || 'Aucun modèle Gemini accessible via ListModels.' };
    } else try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Réponds par le mot OK.' }] }], generationConfig: { maxOutputTokens: 8 } }),
        signal: AbortSignal.timeout(15000),
      });
      const details: any = await res.json().catch(() => ({}));
      out.probe = { model, httpStatus: res.status, ok: res.ok, message: res.ok ? undefined : String(details?.error?.message || res.statusText).slice(0, 200) };
    } catch (err: any) {
      out.probe = { model, ok: false, message: err?.name === 'TimeoutError' ? 'timeout' : 'injoignable' };
    }
  }

  return Response.json(out, { headers });
};
