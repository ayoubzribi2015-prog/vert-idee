import app from '../../server/app.ts';

// Cloudflare Pages Functions : les variables/secrets du dashboard arrivent dans `env`.
// Le code serveur lit process.env (rendu disponible par le flag nodejs_compat).
export const onRequest = async (context: { request: Request; env: Record<string, unknown> }) => {
  for (const [key, value] of Object.entries(context.env || {})) {
    if (typeof value === 'string') (process.env as Record<string, string>)[key] = value;
  }
  return app.fetch(context.request, context.env);
};
