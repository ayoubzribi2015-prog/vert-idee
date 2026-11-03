// Découverte des modèles Gemini réellement accessibles avec la clé configurée.
// Partagé par les Pages Functions (chat, extract-file, generate, ai-status).

// Aucun nom de modèle fictif : seuls les modèles confirmés par ListModels sont utilisés.

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';
const CACHE_TTL_MS = 10 * 60 * 1000;

export type ModelDiscovery = {
  models: string[];
  source: 'listModels' | 'unavailable';
  listModelsStatus: number | null;
  error?: string;
};

let cache: { key: string; at: number; value: ModelDiscovery } | null = null;

const clean = (name: string) => name.replace(/^models\//, '');

// Les modèles « flash » récents d'abord : rapides et adaptés au JSON et au chat.
function rank(name: string): number {
  if (!/gemini/i.test(name)) return 99;
  if (/(image|tts|embedding|aqa|live|audio|vision|robotics|computer|thinking-exp)/i.test(name)) return 90;
  let score = 10;
  if (/flash/i.test(name)) score -= 5;
  if (/lite/i.test(name)) score += 1;
  if (/(preview|exp)/i.test(name)) score += 2;
  const version = name.match(/gemini-(\d+(?:\.\d+)?)/i);
  if (version) score -= Math.min(parseFloat(version[1]), 9) / 10;
  return score;
}

export async function discoverGeminiModels(apiKey: string, preferred?: string): Promise<ModelDiscovery> {
  const now = Date.now();
  let base: ModelDiscovery;

  if (cache && cache.key === apiKey && now - cache.at < CACHE_TTL_MS) {
    base = cache.value;
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(LIST_URL, { headers: { 'x-goog-api-key': apiKey }, signal: controller.signal });
      if (!res.ok) {
        base = { models: [], source: 'unavailable', listModelsStatus: res.status, error: `ListModels HTTP ${res.status}` };
      } else {
        const data: any = await res.json();
        const found = ((data?.models as any[]) || [])
          .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map((m) => clean(String(m.name || '')))
          .filter((n) => n && rank(n) < 90)
          .sort((a, b) => rank(a) - rank(b));
        base = found.length
          ? { models: found.slice(0, 6), source: 'listModels', listModelsStatus: res.status }
          : { models: [], source: 'unavailable', listModelsStatus: res.status, error: 'Aucun modèle generateContent accessible avec cette clé' };
      }
    } catch (err: any) {
      base = { models: [], source: 'unavailable', listModelsStatus: null, error: err?.name === 'AbortError' ? 'ListModels timeout' : 'ListModels injoignable' };
    } finally {
      clearTimeout(timer);
    }
    // Les échecs ne sont pas mis en cache longtemps : on réessaie vite.
    cache = { key: apiKey, at: base.source === 'listModels' ? now : now - CACHE_TTL_MS + 30_000, value: base };
  }

  const pref = preferred?.trim() ? clean(preferred.trim()) : '';
  // GEMINI_MODEL passe en premier seulement s'il est accessible (ou si la liste n'a pas pu être lue).
  const models =
    pref && base.source === 'listModels' && base.models.includes(pref)
      ? [pref, ...base.models.filter((m) => m !== pref)]
      : base.models;
  return { ...base, models };
}
