// Do not silently forward requests to Render. Every API endpoint must be
// implemented as a Cloudflare Pages Function before the migration is complete.
export const onRequest = async (): Promise<Response> =>
  Response.json({
    success: false,
    error: 'Cette fonctionnalité API doit encore être migrée vers Cloudflare.',
    code: 'CLOUDFLARE_MIGRATION_PENDING',
  }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
