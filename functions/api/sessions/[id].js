import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { requireAdmin, requireUser } from '../../_lib/auth.js';
import { clubTimezone } from '../../_lib/config.js';
import {
  asEnum,
  asId,
  asOptionalTitle,
} from '../../_lib/validate.js';

export async function onRequestGet(context) {
  const user = requireUser(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const timezone = clubTimezone(env);
  const sql = getSql(env);

  const sessionRows = await sql`
    SELECT
      s.id::text AS id,
      s.session_date::text AS session_date,
      s.title,
      s.status,
      s.created_at,
      s.created_by::text AS created_by,
      (s.session_date = (now() AT TIME ZONE ${timezone})::date) AS is_today,
      (s.session_date < (now() AT TIME ZONE ${timezone})::date) AS is_past,
      (s.session_date > (now() AT TIME ZONE ${timezone})::date) AS is_future
    FROM sessions s
    WHERE s.id = ${id}
    LIMIT 1
  `;

  const session = sessionRows[0];

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  const attendance = await sql`
    SELECT
      a.id::text AS id,
      a.member_id::text AS member_id,
      a.guest_name,
      a.source,
      a.created_at,
      m.display_name,
      m.status AS member_status
    FROM attendance a
    LEFT JOIN members m ON m.id = a.member_id
    WHERE a.session_id = ${id}
    ORDER BY lower(COALESCE(m.display_name, a.guest_name))
  `;

  const mine = attendance.find(
    (row) => user.member_id && row.member_id === user.member_id,
  ) || null;

  session.headcount = attendance.length;
  session.member_count = attendance.filter((row) => row.member_id).length;
  session.guest_count = attendance.filter((row) => row.guest_name).length;
  session.my_attendance_id = mine?.id || null;
  session.can_check_in = Boolean(
    session.is_today &&
    session.status === 'scheduled' &&
    user.member_id &&
    user.member_status === 'active' &&
    !mine,
  );
  session.can_undo_check_in = Boolean(
    session.is_today &&
    mine &&
    mine.source === 'self',
  );

  return json({ session, attendance });
}

export async function onRequestPatch(context) {
  requireAdmin(context);
  const { request, env, params } = context;
  const id = asId(params.id, 'Session ID');
  const body = await readJson(request);
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      title,
      status
    FROM sessions
    WHERE id = ${id}
    LIMIT 1
  `;

  const current = rows[0];

  if (!current) {
    throw new HttpError(404, 'Session not found');
  }

  const title = body.title === undefined
    ? current.title
    : asOptionalTitle(body.title);
  const status = body.status === undefined
    ? current.status
    : asEnum(body.status, 'Status', ['scheduled', 'cancelled']);

  const updatedRows = await sql`
    UPDATE sessions
    SET title = ${title},
        status = ${status}
    WHERE id = ${id}
    RETURNING
      id::text AS id,
      session_date::text AS session_date,
      title,
      status,
      created_at
  `;

  return json({ session: updatedRows[0] });
}

export async function onRequestDelete(context) {
  requireAdmin(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM sessions
    WHERE id = ${id}
    RETURNING id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'Session not found');
  }

  return json({ ok: true });
}
