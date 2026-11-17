import {
  searchBaseCarbone,
  BASE_CARBONE_VERSION,
  BASE_CARBONE_DATASET,
  BASE_CARBONE_DOC_URL,
} from '../../../src/utils/baseCarbone.ts';

export const onRequestGet = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const size = Math.min(25, Math.max(1, Number(url.searchParams.get('size')) || 12));

    if (!q) {
      return Response.json(
        { success: false, error: 'Paramètre de recherche "q" requis.' },
        { status: 400 }
      );
    }

    const results = await searchBaseCarbone(q, { size, timeoutMs: 6000 });
    return Response.json({
      success: true,
      source: 'ADEME Base Empreinte® / Base Carbone®',
      version: BASE_CARBONE_VERSION,
      dataset: BASE_CARBONE_DATASET,
      documentation: BASE_CARBONE_DOC_URL,
      offline: true,
      count: results.length,
      results,
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de la consultation de l’index local Base Carbone ADEME.',
      },
      { status: 500 }
    );
  }
};
