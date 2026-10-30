import app from '../server/app.js';
import { expressHandler } from './adapter.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Populate process.env from Pages environment variables
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          try { process.env[key] = value; } catch (e) {}
        }
      }
    }

    // Handle API routes through the Express app
    if (url.pathname.startsWith('/api/')) {
      try {
        return await expressHandler(app, request);
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: err?.message || 'Erreur interne du serveur'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve static assets with SPA fallback
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        const indexRequest = new Request(new URL('/', url.origin), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return assetResponse;
    }

    return new Response('Not Found', { status: 404 });
  }
};
