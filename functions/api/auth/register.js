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
      WITH new_user AS (
        INSERT INTO users (email, name, password_hash)
        VALUES (${email}, ${name}, crypt(${password}, gen_salt('bf', 12)))
        RETURNING id, email, name, role, created_at
      ), linked_member AS (
        UPDATE members
        SET user_id = (SELECT id FROM new_user)
        WHERE lower(email) = ${email}
          AND user_id IS NULL
        RETURNING id, display_name, status
      ), new_member AS (
        INSERT INTO members (user_id, display_name, email)
        SELECT id, ${name}, email FROM new_user
        WHERE NOT EXISTS (SELECT 1 FROM linked_member)
        RETURNING id, display_name, status
      ), member_row AS (
        SELECT id, display_name, status FROM linked_member
        UNION ALL
        SELECT id, display_name, status FROM new_member
      )
      SELECT
        u.id::text AS id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        m.id::text AS member_id,
        m.display_name AS member_name,
        m.status AS member_status
      FROM new_user u
      CROSS JOIN member_row m
    `;

    user = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'An account with that email already exists');
    }

    throw error;
  }

  if (!user) {
    throw new HttpError(500, 'Account could not be created');
  }

  const token = await createSession(env, user.id);

  return json({ user }, 201, { 'Set-Cookie': sessionCookie(request, token) });
}
