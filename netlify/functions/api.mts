import serverless from 'serverless-http';
import app from '../../server/app.ts';

// Wraps the shared Express API (also served by server.ts locally) as a modern
// Netlify Function, so AI Gateway credentials are injected at runtime.
const handler = serverless(app);

export default async (req: Request) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : Buffer.from(await req.arrayBuffer()).toString('base64');

  const result: any = await handler(
    {
      httpMethod: req.method,
      path: url.pathname,
      rawQuery: url.search.slice(1),
      queryStringParameters: Object.fromEntries(url.searchParams),
      multiValueQueryStringParameters: null,
      headers: Object.fromEntries(req.headers),
      body,
      isBase64Encoded: true,
    },
    {}
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(result.headers || {})) headers.set(key, String(value));
  for (const [key, values] of Object.entries(result.multiValueHeaders || {})) {
    for (const value of values as string[]) headers.append(key, String(value));
  }

  return new Response(result.body ? Buffer.from(result.body, result.isBase64Encoded ? 'base64' : 'utf8') : null, {
    status: result.statusCode,
    headers,
  });
};

export const config = {
  path: '/api/*',
};
