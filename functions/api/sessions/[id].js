import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { requireAdmin, requireClub, requireMembership } from '../../_lib/clubs.js';
import {
  asEnum,
  asId,
  asOptionalText,
  asOptionalTitle,
} from '../../_lib/validate.js';

export async function onRequestGet(context) {
  const membership = requireMembership(context);
  const club = requireClub(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const sql = getSql(env);

  const sessionRows = await sql`
    SELECT
      s.id::text AS id,
      s.session_date::text AS session_date,
      s.title,
      s.description,
      s.address,
      s.distance,
      s.status,
      s.created_at,
      s.created_by::text AS created_by,
      (s.session_date = (now() AT TIME ZONE ${club.timezone})::date) AS is_today,
      (s.session_date < (now() AT TIME ZONE ${club.timezone})::date) AS is_past,
      (s.session_date > (now() AT TIME ZONE ${club.timezone})::date) AS is_future
    FROM sessions s
    WHERE s.id = ${id}
      AND s.club_id = ${club.id}
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
      a.finish_time_seconds,
      a.created_at,
      m.display_name,
      m.status AS member_status
    FROM attendance a
    LEFT JOIN members m ON m.id = a.member_id
    WHERE a.session_id = ${id}
    ORDER BY lower(COALESCE(m.display_name, a.guest_name))
  `;

  const mine = attendance.find(
    (row) => row.member_id === membership.id,
  ) || null;

  session.headcount = attendance.length;
  session.member_count = attendance.filter((row) => row.member_id).length;
  session.guest_count = attendance.filter((row) => row.guest_name).length;
  session.my_attendance_id = mine?.id || null;
  session.my_finish_time_seconds = mine?.finish_time_seconds ?? null;
  session.can_check_in = Boolean(
    session.is_today &&
    session.status === 'scheduled' &&
    membership.status === 'active' &&
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
  const club = requireClub(context);
  const { request, env, params } = context;
  const id = asId(params.id, 'Session ID');
  const body = await readJson(request);
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      title,
      description,
      address,
      distance,
      status
    FROM sessions
    WHERE id = ${id}
      AND club_id = ${club.id}
    LIMIT 1
  `;

  const current = rows[0];

  if (!current) {
    throw new HttpError(404, 'Session not found');
  }

  const title = body.title === undefined
    ? current.title
    : asOptionalTitle(body.title);
  const description = body.description === undefined
    ? current.description
    : asOptionalText(body.description, 500, 'Description');
  const address = body.address === undefined
    ? current.address
    : asOptionalText(body.address, 200, 'Address');
  const distance = body.distance === undefined
    ? current.distance
    : asOptionalText(body.distance, 60, 'Distance');
  const status = body.status === undefined
    ? current.status
    : asEnum(body.status, 'Status', ['scheduled', 'cancelled']);

  const updatedRows = await sql`
    UPDATE sessions
    SET title = ${title},
        description = ${description},
        address = ${address},
        distance = ${distance},
        status = ${status}
    WHERE id = ${id}
      AND club_id = ${club.id}
    RETURNING
      id::text AS id,
      session_date::text AS session_date,
      title,
      description,
      address,
      distance,
      status,
      created_at
  `;

  return json({ session: updatedRows[0] });
}

export async function onRequestDelete(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { env, params } = context;
  const id = asId(params.id, 'Session ID');
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM sessions
    WHERE id = ${id}
      AND club_id = ${club.id}
    RETURNING id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'Session not found');
  }

  return json({ ok: true });
}
