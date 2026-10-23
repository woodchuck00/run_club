import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import {
  createSession,
  requireUser,
  sessionCookie,
} from '../../_lib/auth.js';
import { asLoginPassword, asPassword } from '../../_lib/validate.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = requireUser(context);
  const body = await readJson(request);
  const currentPassword = asLoginPassword(body.currentPassword);
  const newPassword = asPassword(body.newPassword);
  const sql = getSql(env);

  const rows = await sql`
    SELECT (password_hash = crypt(${currentPassword}, password_hash)) AS valid
    FROM users
    WHERE id = ${user.id}
  `;

  if (!rows[0]?.valid) {
    throw new HttpError(400, 'Current password is incorrect');
  }

  await sql`
    UPDATE users
    SET password_hash = crypt(${newPassword}, gen_salt('bf', 12))
    WHERE id = ${user.id}
  `;

  await sql`DELETE FROM auth_sessions WHERE user_id = ${user.id}`;

  const token = await createSession(env, user.id);

  return json({ ok: true }, 200, {
    'Set-Cookie': sessionCookie(request, token),
  });
}
