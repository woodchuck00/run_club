import { HttpError, json } from '../../../_lib/http.js';
import { getSql } from '../../../_lib/db.js';
import { requireClub, requireMembership } from '../../../_lib/clubs.js';
import { asId } from '../../../_lib/validate.js';

async function getCheckInSession(env, club, id) {
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      status,
      (session_date = (now() AT TIME ZONE ${club.timezone})::date) AS is_today
    FROM sessions
    WHERE id = ${id}
      AND club_id = ${club.id}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function onRequestPost(context) {
  const membership = requireMembership(context);
  const club = requireClub(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const session = await getCheckInSession(env, club, id);

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  if (membership.status !== 'active') {
    throw new HttpError(403, 'Archived members cannot check in');
  }

  if (session.status !== 'scheduled') {
    throw new HttpError(409, 'This session has been cancelled');
  }

  if (!session.is_today) {
    throw new HttpError(403, 'Check-in is only available on the day of the session');
  }

  const sql = getSql(env);
  const rows = await sql`
    INSERT INTO attendance (session_id, member_id, source, marked_by)
    VALUES (${id}, ${membership.id}, 'self', ${membership.user_id})
    ON CONFLICT DO NOTHING
    RETURNING id::text AS id
  `;

  if (rows.length) {
    return json({ attendance_id: rows[0].id }, 201);
  }

  const existing = await sql`
    SELECT id::text AS id
    FROM attendance
    WHERE session_id = ${id}
      AND member_id = ${membership.id}
    LIMIT 1
  `;

  return json({ attendance_id: existing[0]?.id || null, already: true });
}

export async function onRequestDelete(context) {
  const membership = requireMembership(context);
  const club = requireClub(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM attendance a
    USING sessions s
    WHERE a.session_id = s.id
      AND a.session_id = ${id}
      AND s.club_id = ${club.id}
      AND a.member_id = ${membership.id}
      AND a.source = 'self'
      AND s.session_date = (now() AT TIME ZONE ${club.timezone})::date
    RETURNING a.id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'No self check-in to undo for today');
  }

  return json({ ok: true });
}
