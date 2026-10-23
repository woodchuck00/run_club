import { HttpError } from './http.js';
import { getSql } from './db.js';

const SESSION_COOKIE = 'rc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function readSessionToken(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const parts = cookieHeader.split(/;\s*/);

  for (const part of parts) {
    if (part.startsWith(`${SESSION_COOKIE}=`)) {
      return decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
    }
  }

  return null;
}

function isSecureRequest(request) {
  return new URL(request.url).protocol === 'https:';
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(digest);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function sessionCookie(request, token) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  if (isSecureRequest(request)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearedSessionCookie(request) {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (isSecureRequest(request)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export async function createSession(env, userId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const sql = getSql(env);

  await sql`
    INSERT INTO auth_sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, now() + interval '30 days')
  `;

  return token;
}

export async function deleteSession(request, env) {
  const token = readSessionToken(request);

  if (!token) {
    return;
  }

  const tokenHash = await sha256(token);
  const sql = getSql(env);
  await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`;
}

export async function getSessionUser(request, env) {
  const token = readSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      u.id::text AS id,
      u.email,
      u.name,
      u.role,
      u.created_at,
      m.id::text AS member_id,
      m.display_name AS member_name,
      m.status AS member_status
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN members m ON m.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
    LIMIT 1
  `;

  return rows[0] || null;
}

export function requireUser(context) {
  if (!context.data.user) {
    throw new HttpError(401, 'Sign in required');
  }

  return context.data.user;
}

export function requireAdmin(context) {
  const user = requireUser(context);

  if (user.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }

  return user;
}
