import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import { requireAdmin, requireClub } from '../../_lib/clubs.js';
import {
  asName,
  asOptionalEmail,
} from '../../_lib/validate.js';

export async function onRequestGet(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { request, env } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'all';

  if (!['all', 'active', 'archived'].includes(status)) {
    throw new HttpError(400, 'Status filter must be all, active, or archived');
  }

  const sql = getSql(env);
  const members = await sql`
    SELECT
      m.id::text AS id,
      m.display_name,
      m.email,
      m.role,
      m.status,
      m.created_at,
      m.user_id::text AS user_id,
      COUNT(s.id)::int AS attended_count,
      MAX(s.session_date)::text AS last_attended
    FROM members m
    LEFT JOIN attendance a ON a.member_id = m.id
    LEFT JOIN sessions s ON s.id = a.session_id
      AND s.status = 'scheduled'
      AND s.club_id = m.club_id
    WHERE m.club_id = ${club.id}
      AND (${status} = 'all' OR m.status = ${status})
    GROUP BY m.id
    ORDER BY (m.status = 'archived'), lower(m.display_name)
  `;

  return json({ members });
}

export async function onRequestPost(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { request, env } = context;
  const body = await readJson(request);
  const displayName = asName(body.displayName);
  const email = asOptionalEmail(body.email);
  const sql = getSql(env);

  let member;

  try {
    const rows = await sql`
      INSERT INTO members (club_id, user_id, display_name, email)
      VALUES (
        ${club.id},
        (SELECT id FROM users WHERE lower(email) = ${email}),
        ${displayName},
        ${email}
      )
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

  return json({ member }, 201);
}
