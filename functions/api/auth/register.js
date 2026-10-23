import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import {
  createSession,
  sessionCookie,
} from '../../_lib/auth.js';
import {
  asEmail,
  asName,
  asPassword,
} from '../../_lib/validate.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await readJson(request);
  const name = asName(body.name);
  const email = asEmail(body.email);
  const password = asPassword(body.password);
  const sql = getSql(env);

  let user;

  try {
    const rows = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, ${name}, crypt(${password}, gen_salt('bf', 12)))
      RETURNING id::text AS id, email, name, created_at
    `;

    user = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'An account with that email already exists');
    }

    throw error;
  }

  const token = await createSession(env, user.id);

  return json({ user }, 201, { 'Set-Cookie': sessionCookie(request, token) });
}
