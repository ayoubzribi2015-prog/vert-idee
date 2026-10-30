// Cloudflare Pages is an edge runtime. The Express API runs on Render,
// so forward API requests rather than importing the Node.js Express server.
type PagesContext = { request: Request; env: Record<string, unknown> };

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const rawOrigin = typeof env.API_BACKEND_URL === 'string' && env.API_BACKEND_URL.trim()
    ? env.API_BACKEND_URL.trim()
    : 'https://vert-idee.onrender.com';

  let backend: URL;
  try {
    backend = new URL(rawOrigin);
    if (backend.protocol !== 'https:' || backend.username || backend.password ||
        backend.pathname !== '/' || backend.search || backend.hash) {
      throw new Error('Invalid backend origin');
    }
  } catch {
    return Response.json({ success: false, error: 'Configuration API_BACKEND_URL invalide.' }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, backend);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('cookie');
  headers.delete('authorization');
  // Credentials are not forwarded cross-origin by default. Add explicit
  // authenticated proxy support only after reviewing the API auth contract.
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('set-cookie');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error('[Pages API proxy]', error);
    return Response.json({ success: false, error: 'Service API temporairement indisponible.' }, { status: 502 });
  }
};
