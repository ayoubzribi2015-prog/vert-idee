// Découverte et hiérarchisation stricte des modèles Gemini selon le classement imposé :
// 1. gemini-3.8-flash
// 2. gemini-3.5-flash-lite
// 3. gemini-3.6
// 4. gemini-3.6-flash
// 5. gemini-3.1-flash-lite
// On commence avec 1. gemini-3.8-flash puis on passe au modèle suivant uniquement si le modèle actuel rencontre un problème.

export const ORDERED_GEMINI_MODELS = [
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
  if (lower === 'gemini-3.8-flash' || lower.includes('gemini-3.8-flash')) return 1;
  if (lower === 'gemini-3.5-flash-lite' || lower.includes('gemini-3.5-flash-lite')) return 2;
  if (lower === 'gemini-3.6' || (lower.includes('gemini-3.6') && !lower.includes('flash'))) return 3;
  if (lower === 'gemini-3.6-flash' || lower.includes('gemini-3.6-flash')) return 4;
  if (lower === 'gemini-3.1-flash-lite' || lower.includes('gemini-3.1-flash-lite')) return 5;
  return 99;
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

        // Si des modèles de la hiérarchie ont été validés via ListModels, on les utilise selon le classement exact
        // Sinon, on garantit les 5 modèles imposés dans l'ordre strict
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

  // Toujours s'assurer que les modèles sont dans l'ordre exact demandé :
  // 1. gemini-3.8-flash, 2. gemini-3.5-flash-lite, 3. gemini-3.6, 4. gemini-3.6-flash, 5. gemini-3.1-flash-lite
  const orderedList = [...ORDERED_GEMINI_MODELS];
  const finalModels: string[] = [];

  for (const target of orderedList) {
    // Si la liste découverte contient ce modèle (ou un alias), on le place
    const match = base.models.find((m) => m === target || m.includes(target));
    if (match && !finalModels.includes(match)) {
      finalModels.push(match);
    } else if (!finalModels.includes(target)) {
      finalModels.push(target);
    }
  }

  // Ajouter d'éventuels autres modèles découverts à la fin
  for (const m of base.models) {
    if (!finalModels.includes(m)) {
      finalModels.push(m);
    }
  }

  return { ...base, models: finalModels };
}
