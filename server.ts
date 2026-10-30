import { createServer as createViteServer } from 'vite';
import { getRequestListener } from '@hono/node-server';
import path from 'path';
import http from 'http';
import fs from 'fs';
import app from './server/app.ts';

// Serveur local (dev / preview) uniquement. En production, Cloudflare Pages sert
// `dist` et exécute l'API via functions/api/[[path]].ts.
process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Rejet non géré :', reason?.message || reason);
});

const PORT = Number(process.env.PORT) || 3000;
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2',
};

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);
  const apiListener = getRequestListener(app.fetch);
  let vite: any = null;

  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/')) return apiListener(req, res);
    if (vite) return vite.middlewares(req, res, () => { res.statusCode = 404; res.end(); });

    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(distPath, urlPath);
    if (!file.startsWith(distPath) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(distPath, 'index.html');
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });

  if (!isProduction) {
    console.log('Running in development mode (Vite middleware)');
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
  } else {
    console.log('Running in production mode (static serving)');
  }

  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
}

startServer();
