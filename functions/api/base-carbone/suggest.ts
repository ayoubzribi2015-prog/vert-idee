import {
  suggestBaseCarboneFactors,
  BASE_CARBONE_VERSION,
  type AcvStageCategory,
} from '../../../src/utils/baseCarbone.ts';

const VALID_STAGES = new Set([
  'raw_materials',
  'manufacturing',
  'packaging',
  'transport',
  'usage',
  'end_of_life',
]);

export const onRequestGet = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    const url = new URL(request.url);
    const stageRaw = (url.searchParams.get('stage') || '').trim();
    const stageCategory = VALID_STAGES.has(stageRaw) ? (stageRaw as AcvStageCategory) : undefined;
    const results = await suggestBaseCarboneFactors({
      stageCategory,
      title: url.searchParams.get('title') || undefined,
      sector: url.searchParams.get('sector') || undefined,
      description: url.searchParams.get('description') || undefined,
      location: url.searchParams.get('location') || undefined,
      query: url.searchParams.get('q') || undefined,
      size: Math.min(20, Math.max(1, Number(url.searchParams.get('size')) || 8)),
    });
    return Response.json({
      success: true,
      source: 'ADEME Base Empreinte® / Base Carbone®',
      version: BASE_CARBONE_VERSION,
      offline: true,
      count: results.length,
      results,
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de la suggestion de facteurs ADEME.',
      },
      { status: 500 }
    );
  }
};
