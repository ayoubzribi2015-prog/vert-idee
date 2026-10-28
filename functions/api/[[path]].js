// Cloudflare Pages Function: forward only application API requests to Render.
// Gemini credentials remain on the Render server, never in the browser.
const RENDER_API = 'https://vert-idee.onrender.com';

export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const upstreamUrl = RENDER_API + incoming.pathname + incoming.search;

  try {
    const response = await fetch(upstreamUrl, {
      method: context.request.method,
      headers: context.request.headers,
      body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
      redirect: 'manual',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return Response.json({
        success: false,
        error: 'Le serveur Render ne renvoie pas de JSON. Vérifiez que le service API est actif.'
      }, { status: 502 });
    }

    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Render API unavailable:', error);
    return Response.json({
      success: false,
      error: 'Connexion au serveur Render impossible. Vérifiez que le service est actif.'
    }, { status: 502 });
  }
}
