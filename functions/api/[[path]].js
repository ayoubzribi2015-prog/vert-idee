// Cloudflare Pages Function: proxy /api/* to the existing Render Express server.
// Gemini API credentials must stay on Render, never in client-side Vite variables.
const RENDER_ORIGIN = 'https://vert-idee.onrender.com';

function apiError(status, message) {
  return Response.json({ success: false, error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequest({ request }) {
  const source = new URL(request.url);
  const target = RENDER_ORIGIN + source.pathname + source.search;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('content-length');

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return apiError(502, `Le serveur Render a retourné une réponse non JSON (HTTP ${upstream.status}). Vérifiez le service API.`);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Cloudflare API proxy]', error);
    return apiError(502, 'Le serveur Render est inaccessible. Vérifiez son état et réessayez.');
  }
}
