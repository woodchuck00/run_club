import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import { requireAdmin, requireClub, requireMembership } from '../../_lib/clubs.js';
import {
  asDate,
  asOptionalText,
  asOptionalTitle,
  parseLimit,
} from '../../_lib/validate.js';

export async function onRequestGet(context) {
  const membership = requireMembership(context);
  const club = requireClub(context);
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 100, 200);
  const sql = getSql(env);

  const sessions = await sql`
    SELECT
      s.id::text AS id,
      s.session_date::text AS session_date,
      s.title,
      s.description,
      s.address,
      s.distance,
      s.status,
      s.created_at,
      (s.session_date = (now() AT TIME ZONE ${club.timezone})::date) AS is_today,
      (s.session_date < (now() AT TIME ZONE ${club.timezone})::date) AS is_past,
      (s.session_date > (now() AT TIME ZONE ${club.timezone})::date) AS is_future,
      COUNT(a.id)::int AS headcount,
      (COUNT(a.id) FILTER (WHERE a.member_id IS NOT NULL))::int AS member_count,
      (COUNT(a.id) FILTER (WHERE a.guest_name IS NOT NULL))::int AS guest_count,
      (
        SELECT mine.id::text
        FROM attendance mine
        WHERE mine.session_id = s.id
          AND mine.member_id = ${membership.id}
        LIMIT 1
      ) AS my_attendance_id,
      (
        SELECT mine.source
        FROM attendance mine
        WHERE mine.session_id = s.id
          AND mine.member_id = ${membership.id}
        LIMIT 1
      ) AS my_attendance_source,
      (
        SELECT mine.finish_time_seconds
        FROM attendance mine
        WHERE mine.session_id = s.id
          AND mine.member_id = ${membership.id}
        LIMIT 1
      ) AS my_finish_time_seconds
    FROM sessions s
    LEFT JOIN attendance a ON a.session_id = s.id
    WHERE s.club_id = ${club.id}
    GROUP BY s.id
    ORDER BY s.session_date DESC
    LIMIT ${limit}
  `;

  return json({ sessions });
}

export async function onRequestPost(context) {
  const membership = requireAdmin(context);
  const club = requireClub(context);
  const { request, env } = context;
  const body = await readJson(request);
  const sessionDate = asDate(body.sessionDate);
  const title = asOptionalTitle(body.title);
  const description = asOptionalText(body.description, 500, 'Description');
  const address = asOptionalText(body.address, 200, 'Address');
  const distance = asOptionalText(body.distance, 60, 'Distance');
  const sql = getSql(env);

  let session;

  try {
    const rows = await sql`
      INSERT INTO sessions (
        club_id,
        session_date,
        title,
        description,
        address,
        distance,
        created_by
      )
      VALUES (
        ${club.id},
        ${sessionDate},
        ${title},
        ${description},
        ${address},
        ${distance},
        ${membership.user_id}
      )
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
    session = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'A session already exists for that date');
    }

    throw error;
  }

  return json({ session }, 201);
}
