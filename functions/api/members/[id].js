import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import { requireAdmin, requireClub } from '../../_lib/clubs.js';
import {
  asEnum,
  asId,
  asName,
  asOptionalEmail,
} from '../../_lib/validate.js';

export async function onRequestPatch(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { request, env, params } = context;
  const id = asId(params.id, 'Member ID');
  const body = await readJson(request);
  const sql = getSql(env);
  const currentRows = await sql`
    SELECT
      m.id::text AS id,
      m.display_name,
      m.email,
      m.role,
      m.status,
      m.user_id::text AS user_id
    FROM members m
    WHERE m.id = ${id}
      AND m.club_id = ${club.id}
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
  }

  const removesActiveAdmin = current.role === 'admin' &&
    current.status === 'active' &&
    (role !== 'admin' || status !== 'active');

  if (removesActiveAdmin) {
    const counts = await sql`
      SELECT COUNT(*)::int AS admin_count
      FROM members
      WHERE club_id = ${club.id}
        AND role = 'admin'
        AND status = 'active'
    `;

    if (counts[0].admin_count <= 1) {
      throw new HttpError(400, 'At least one active admin is required');
    }
  }

  let member;

  try {
    const rows = await sql`
      UPDATE members
      SET display_name = ${displayName},
          email = ${email},
          status = ${status},
          role = ${role}
      WHERE id = ${id}
        AND club_id = ${club.id}
      RETURNING
        id::text AS id,
        display_name,
        email,
        role,
        status,
        created_at,
        user_id::text AS user_id
    `;
    member = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'That email is already used by another roster member');
    }

    throw error;
  }

  return json({ member });
}
