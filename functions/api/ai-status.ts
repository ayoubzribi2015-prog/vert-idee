// Native Cloudflare Pages Function: no external backend required.
export const onRequestGet = async (): Promise<Response> =>
  Response.json({ success: true, runtime: 'cloudflare-pages', service: 'vert-idee-api' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
