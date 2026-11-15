// Découverte et hiérarchisation stricte des modèles Gemini selon le classement imposé :
// 1. gemini-4-hydrogen (Gemini 4 Hydrogen)
// 2. gemini-3.8-flash
// 3. gemini-3.5-flash-lite
// 4. gemini-3.6
// 5. gemini-3.6-flash
// 6. gemini-3.1-flash-lite
// On commence avec 1. gemini-4-hydrogen puis on passe au modèle suivant uniquement si le modèle actuel échoue ou renvoie une réponse vide.

export const ORDERED_GEMINI_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
] as const;

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';
const CACHE_TTL_MS = 10 * 60 * 1000;

export type ModelDiscovery = {
  models: string[];
  source: 'listModels' | 'default';
  listModelsStatus: number | null;
  error?: string;
};

let cache: { key: string; at: number; value: ModelDiscovery } | null = null;

const clean = (name: string) => name.replace(/^models\//, '');

function getModelRank(name: string): number {
  const lower = name.toLowerCase();
  if (/(tts|image|live|transcribe|translate|embedding|audio|veo|lyria)/.test(lower)) return 99;
  if (lower === 'gemini-4-hydrogen') return 1;
  if (lower === 'gemini-3.8-flash') return 2;
  if (lower === 'gemini-3.5-flash-lite') return 3;
  if (lower === 'gemini-3.6') return 4;
  if (lower === 'gemini-3.6-flash') return 5;
  if (lower === 'gemini-3.1-flash-lite') return 6;
  return 99;
}

export async function discoverGeminiModels(apiKey: string, _preferred?: string): Promise<ModelDiscovery> {
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
        base = {
          models: [...ORDERED_GEMINI_MODELS],
          source: 'default',
          listModelsStatus: res.status,
          error: `ListModels HTTP ${res.status}`,
        };
      } else {
        const data: any = await res.json();
        const found = ((data?.models as any[]) || [])
          .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map((m) => clean(String(m.name || '')))
          .filter((n) => n && getModelRank(n) < 90)
          .sort((a, b) => getModelRank(a) - getModelRank(b));

        const models = found.length > 0 ? found : [...ORDERED_GEMINI_MODELS];
        base = {
          models,
          source: found.length > 0 ? 'listModels' : 'default',
          listModelsStatus: res.status,
        };
      }
    } catch (err: any) {
      base = {
        models: [...ORDERED_GEMINI_MODELS],
        source: 'default',
        listModelsStatus: null,
        error: err?.name === 'AbortError' ? 'ListModels timeout' : 'ListModels injoignable',
      };
    } finally {
      clearTimeout(timer);
    }
    cache = { key: apiKey, at: now, value: base };
  }

  // Ordre fixe strict établi par ORDERED_GEMINI_MODELS :
  // 1. gemini-4-hydrogen, 2. gemini-3.8-flash, 3. gemini-3.5-flash-lite, 4. gemini-3.6, 5. gemini-3.6-flash, 6. gemini-3.1-flash-lite
  return { ...base, models: [...ORDERED_GEMINI_MODELS] };
}
