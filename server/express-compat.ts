/**
 * Couche de compatibilité minimale « style Express » au-dessus de Hono.
 *
 * Elle permet de conserver les handlers existants (req.body, req.params, req.query,
 * res.status().json()) tout en s'exécutant sur Cloudflare Workers, où Express
 * (qui dépend de http/net/stream) ne peut pas tourner.
 */
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

export interface Request {
  body: any;
  params: Record<string, string>;
  query: Record<string, any>;
  headers: Headers;
  method: string;
}

export interface Response {
  status(code: number): Response;
  json(data: unknown): Response;
  send(data?: unknown): Response;
  end(): Response;
}

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;

async function readBody(c: Context): Promise<{ body: any; error?: 'invalid-json' }> {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') return { body: {} };

  const contentType = c.req.header('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const text = await c.req.text();
      return { body: text.trim() ? JSON.parse(text) : {} };
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return { body: Object.fromEntries(new URLSearchParams(await c.req.text())) };
    }
  } catch {
    return { body: {}, error: 'invalid-json' };
  }
  return { body: {} };
}

function wrap(handler: Handler) {
  return async (c: Context) => {
    const { body, error } = await readBody(c);
    if (error) {
      return c.json({ success: false, error: 'Format de requête JSON invalide.' }, 400);
    }

    const query: Record<string, any> = {};
    for (const [key, value] of new URL(c.req.url).searchParams) query[key] = value;

    const req: Request = {
      body,
      params: c.req.param() as Record<string, string>,
      query,
      headers: c.req.raw.headers,
      method: c.req.method,
    };

    return new Promise<globalThis.Response>((resolve) => {
      let status = 200;
      let done = false;
      const finish = (response: globalThis.Response) => {
        if (!done) {
          done = true;
          resolve(response);
        }
      };

      const res: Response = {
        status(code) {
          status = code;
          return res;
        },
        json(data) {
          finish(c.json(data as any, status as any));
          return res;
        },
        send(data) {
          finish(new globalThis.Response(data == null ? null : String(data), { status, headers: { "Content-Type": "text/plain; charset=UTF-8" } }));
          return res;
        },
        end() {
          finish(new globalThis.Response(null, { status }));
          return res;
        },
      };

      Promise.resolve()
        .then(() => handler(req, res))
        .then(() => {
          if (!done) finish(c.json({ success: false, error: 'Aucune réponse générée.' }, 500));
        })
        .catch((err: any) => {
          console.error('[API] Erreur non gérée :', err?.message || err);
          finish(c.json({ success: false, error: err?.message || 'Erreur interne du serveur.' }, 500));
        });
    });
  };
}

export function createApp() {
  const hono = new Hono();
  hono.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

  return {
    hono,
    fetch: hono.fetch.bind(hono),
    get: (path: string, handler: Handler) => hono.get(path, wrap(handler)),
    post: (path: string, handler: Handler) => hono.post(path, wrap(handler)),
    put: (path: string, handler: Handler) => hono.put(path, wrap(handler)),
    delete: (path: string, handler: Handler) => hono.delete(path, wrap(handler)),
  };
}
