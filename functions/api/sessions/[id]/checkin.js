import { HttpError, json } from '../../../_lib/http.js';
import { getSql } from '../../../_lib/db.js';
import { requireUser } from '../../../_lib/auth.js';
import { clubTimezone } from '../../../_lib/config.js';
import { asId } from '../../../_lib/validate.js';

async function getCheckInSession(env, id) {
  const timezone = clubTimezone(env);
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      status,
      (session_date = (now() AT TIME ZONE ${timezone})::date) AS is_today
    FROM sessions
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function onRequestPost(context) {
  const user = requireUser(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const session = await getCheckInSession(env, id);

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  if (!user.member_id) {
    throw new HttpError(400, 'Your account is not linked to a roster member');
  }

  if (user.member_status !== 'active') {
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
    VALUES (${id}, ${user.member_id}, 'self', ${user.id})
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
      AND member_id = ${user.member_id}
    LIMIT 1
  `;

  return json({ attendance_id: existing[0]?.id || null, already: true });
}

export async function onRequestDelete(context) {
  const user = requireUser(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');

  if (!user.member_id) {
    throw new HttpError(400, 'Your account is not linked to a roster member');
  }

  const timezone = clubTimezone(env);
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM attendance a
    USING sessions s
    WHERE a.session_id = s.id
      AND a.session_id = ${id}
      AND a.member_id = ${user.member_id}
      AND a.source = 'self'
      AND s.session_date = (now() AT TIME ZONE ${timezone})::date
    RETURNING a.id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'No self check-in to undo for today');
  }

  return json({ ok: true });
}
