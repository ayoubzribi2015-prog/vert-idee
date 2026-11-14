import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import http from 'http';
import fs from 'fs';
import app from './server/app.ts';

process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Rejet non géré (ignoré pour garder le serveur actif) :', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('[Server] Exception non capturée (ignorée pour garder le serveur actif) :', err?.message || err);
});

function resolvePort(): number {
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const parsed = Number(process.argv[portIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const envPort = Number(process.env.PORT);
  // Port 8080 is reserved by Nginx reverse-proxy in AI Studio environment
  if (!isNaN(envPort) && envPort > 0 && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

const PORT = resolvePort();

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);
  const server = http.createServer(app);

  if (!isProduction) {
    console.log('Running in development mode (Vite middleware)');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode (static serving)');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Make sure no other process is running.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
