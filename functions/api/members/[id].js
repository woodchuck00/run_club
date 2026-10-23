import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import {
  asEnum,
  asId,
  asName,
  asOptionalEmail,
} from '../../_lib/validate.js';

export async function onRequestPatch(context) {
  requireAdmin(context);
  const { request, env, params } = context;
  const id = asId(params.id, 'Member ID');
  const body = await readJson(request);
  const sql = getSql(env);
  const currentRows = await sql`
    SELECT
      m.id::text AS id,
      m.display_name,
      m.email,
      m.status,
      m.user_id::text AS user_id,
      u.role
    FROM members m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ${id}
    LIMIT 1
  `;

  const current = currentRows[0];

  if (!current) {
    throw new HttpError(404, 'Member not found');
  }

  const displayName = body.displayName === undefined
    ? current.display_name
    : asName(body.displayName);
  const email = body.email === undefined
    ? current.email
    : asOptionalEmail(body.email);
  const status = body.status === undefined
    ? current.status
    : asEnum(body.status, 'Status', ['active', 'archived']);

  let role = current.role;

  if (body.role !== undefined) {
    if (!current.user_id) {
      throw new HttpError(400, 'This roster member does not have an account');
    }

    role = asEnum(body.role, 'Role', ['admin', 'member']);

    if (current.role === 'admin' && role === 'member') {
      const counts = await sql`
        SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'admin'
      `;

      if (counts[0].admin_count <= 1) {
        throw new HttpError(400, 'At least one admin account is required');
      }
    }
  }

  const updateUserEmail = body.email !== undefined && email !== null;
  let member;

  try {
    const rows = await sql`
      WITH updated_member AS (
        UPDATE members
        SET display_name = ${displayName},
            email = ${email},
            status = ${status}
        WHERE id = ${id}
        RETURNING
          id::text AS id,
          display_name,
          email,
          status,
          created_at,
          user_id::text AS user_id
      ), updated_user AS (
        UPDATE users
        SET email = ${email}
        WHERE id = ${current.user_id}
          AND ${updateUserEmail}::boolean
        RETURNING id
      )
      SELECT * FROM updated_member
    `;
    member = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'That email is already used by another account or roster member');
    }

    throw error;
  }

  if (body.role !== undefined) {
    await sql`UPDATE users SET role = ${role} WHERE id = ${current.user_id}`;
  }

  member.role = role;

  return json({ member });
}
