import { HttpError, json } from '../_lib/http.js';
import { getSessionUser } from '../_lib/auth.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function verifyOrigin(request, env, url) {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return;
  }

  const allowed = new Set([url.origin]);
  const configured = (env.APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  for (const value of configured) {
    allowed.add(value);
  }

  if (!allowed.has(origin)) {
    throw new HttpError(403, 'Request origin is not allowed');
  }
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);

  try {
    if (UNSAFE_METHODS.has(request.method)) {
      verifyOrigin(request, env, url);
    }

    data.user = await getSessionUser(request, env);

    return withSecurityHeaders(await context.next());
  } catch (error) {
    if (error instanceof HttpError) {
      return withSecurityHeaders(
        json({ error: error.message, details: error.details }, error.status),
      );
    }

    console.error('Unhandled API error', error);
    return withSecurityHeaders(json({ error: 'Internal server error' }, 500));
  }
}
