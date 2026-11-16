import { searchBaseCarbone } from '../../../src/utils/baseCarbone.ts';

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
      source: 'ADEME Base Carbone®',
      dataset: 'base-carboner',
      count: results.length,
      results,
    });
  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de la consultation de la Base Carbone ADEME.',
      },
      { status: 500 }
    );
  }
};
