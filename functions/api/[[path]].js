import serverless from 'serverless-http';
import app from '../../server/app.ts';

// Serverless handler for Cloudflare Pages Functions
const handler = serverless(app);

export async function onRequest(context) {
  const { request, env } = context;

  // Inject Cloudflare Pages environment variables into process.env
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string' && value) {
        try {
          process.env[key] = value;
        } catch (e) {
          // Ignore read-only process.env errors
        }
      }
    }
  }

  // Handle CORS preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(request.url);
    let body = '';

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = Buffer.from(buffer).toString('base64');
      }
    }

    const event = {
      httpMethod: request.method,
      path: url.pathname,
      rawQuery: url.search.slice(1),
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body,
      isBase64Encoded: true,
    };

    const result = await handler(event, {});

    const responseHeaders = new Headers();
    if (result.headers) {
      for (const [key, val] of Object.entries(result.headers)) {
        if (val !== undefined && val !== null) {
          responseHeaders.set(key, String(val));
        }
      }
    }
    if (result.multiValueHeaders) {
      for (const [key, vals] of Object.entries(result.multiValueHeaders)) {
        if (Array.isArray(vals)) {
          for (const v of vals) {
            responseHeaders.append(key, String(v));
          }
        }
      }
    }

    const responseBody = result.body
      ? Buffer.from(result.body, result.isBase64Encoded ? 'base64' : 'utf8')
      : null;

    return new Response(responseBody, {
      status: result.statusCode || 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[Cloudflare API Handler Error]', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Erreur lors du traitement de la requête API.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
