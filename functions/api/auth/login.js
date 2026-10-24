import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { createSession, sessionCookie } from '../../_lib/auth.js';
import { asEmail, asLoginPassword } from '../../_lib/validate.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await readJson(request);
  const email = asEmail(body.email);
  const password = asLoginPassword(body.password);
  const sql = getSql(env);

  const rows = await sql`
    SELECT
      u.id::text AS id,
      u.email,
      u.display_name,
      u.created_at,
      (u.password_hash = crypt(${password}, u.password_hash)) AS valid
    FROM users u
    WHERE lower(u.email) = ${email}
    LIMIT 1
  `;

  const user = rows[0];

  if (!user || !user.valid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  delete user.valid;

  await sql`DELETE FROM auth_sessions WHERE expires_at < now()`;

  const token = await createSession(env, user.id);

  return json({ user }, 200, { 'Set-Cookie': sessionCookie(request, token) });
}
