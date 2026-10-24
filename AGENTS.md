# AGENTS.md — running Vert'Idée in the Base44 sandbox

## Architecture (non-obvious)
- Despite the `vite.config.ts`, the frontend is **not** served by a Vite dev
  server on its own port. `server.ts` is an Express app that creates Vite in
  `middlewareMode` and shares its HTTP server with the HMR WebSocket
  (`hmr: { server }`). One process on port **3000** serves the API (`/api/*`) and
  the SPA — single origin, so there is no CORS or API-URL configuration anywhere.
- `NODE_ENV=production` + an existing `dist/` switches the server to static
  serving. In the sandbox we deliberately stay in dev mode: that is what gives
  live reload of `src/**`.
- `server.js` is a pre-bundled copy of `server.ts` (legacy build artifact) and is
  not involved in the dev loop. Edit `server.ts`.

## Setup
```bash
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml ps          # web should be healthy
docker compose -f docker-compose.base44.yml logs -f web
```

- **Package manager is Bun** (`bun.lock` is the only lockfile).
  `npm install` fails with `ERESOLVE` (`@vitejs/plugin-react` peer conflict
  against vite 8). Use `bun install --frozen-lockfile`.
- The compose service installs Bun on first start and then runs the repo's own
  `dev` script (`tsx server.ts`); dependencies land in the sandbox's
  `node_modules/`, so restarts are fast and `bun.lock` is never rewritten.

## Verification
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200` with
  the Vite-transformed `index.html` (`Running in development mode (Vite
  middleware)` in the logs).
- `curl -s http://localhost:3000/api/ai-status` → `{"geminiKeyConfigured":…,"gatewayConfigured":…}`.
  This is also the compose healthcheck.
- Type check: `bun run lint` (`tsc --noEmit`).
- End-to-end smoke test: fill the home page form (title + description) and run
  the diagnostic — `/api/analyze` returns a full audit and the report tabs
  render. This works with or without a Gemini key.

## Credentials / degraded modes
- **`GEMINI_API_KEY`** (platform secret → `/run/base44/app.env`): needed for real
  Gemini calls. Without it the server logs
  `API key should be set when using the Gemini API.` at import time and reports
  `geminiKeyConfigured: false`, but `/api/analyze` and `/api/chat` degrade
  gracefully to `src/utils/fallbackExpertAudit.ts` instead of failing.
  `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` are an optional alternate AI route.
- **Firebase** (`firebase-applet-config.json`, committed): the web `apiKey` is
  redacted (`"******"`), so Google sign-in and the Firestore history are inert out
  of the box. The app still renders and works signed-out (history is hidden for
  anonymous users). Server-side Firebase Admin turns on only when Application
  Default Credentials are present (`GOOGLE_APPLICATION_CREDENTIALS`, `K_SERVICE`,
  `GOOGLE_CLOUD_PROJECT` or `FUNCTION_TARGET`); otherwise `/api/projects` keeps
  projects in memory.
- Firestore rules live in `firestore.rules`; nothing in the sandbox applies them.

## Sandbox overrides
- None in application code. The service passes the platform's
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` straight into `environment:` (Vite ≥ 6.1
  appends it to `server.allowedHosts`) and `BASE44_PREVIEW_MODE` through
  untouched — the app behaves identically with the flag unset.
