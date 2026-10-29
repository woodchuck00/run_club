import { HttpError, json, readJson } from '../../../_lib/http.js';
import { getSql, pgErrorCode } from '../../../_lib/db.js';
import { requireAdmin, requireClub } from '../../../_lib/clubs.js';
import {
  asGuestName,
  asId,
} from '../../../_lib/validate.js';

export async function onRequestPost(context) {
  const membership = requireAdmin(context);
  const club = requireClub(context);
  const { request, env, params } = context;
  const id = asId(params.id, 'Session ID');
  const body = await readJson(request);
  const hasMember = body.memberId !== undefined && body.memberId !== null;
  const hasGuest = body.guestName !== undefined && body.guestName !== null;

  if (hasMember === hasGuest) {
    throw new HttpError(400, 'Provide either memberId or guestName');
  }

  const sql = getSql(env);
  const sessionRows = await sql`
    SELECT id::text AS id
    FROM sessions
    WHERE id = ${id}
      AND club_id = ${club.id}
    LIMIT 1
  `;

  if (!sessionRows.length) {
    throw new HttpError(404, 'Session not found');
  }

  if (hasMember) {
    const memberId = asId(body.memberId, 'Member ID');
    const memberRows = await sql`
      SELECT id::text AS id, display_name
      FROM members
      WHERE id = ${memberId}
        AND club_id = ${club.id}
      LIMIT 1
    `;

    if (!memberRows.length) {
      throw new HttpError(404, 'Member not found');
    }

    try {
      const rows = await sql`
        INSERT INTO attendance (session_id, member_id, source, marked_by)
        VALUES (${id}, ${memberId}, 'admin', ${membership.user_id})
        RETURNING
          id::text AS id,
          member_id::text AS member_id,
          guest_name,
          source,
          finish_time_seconds
      `;

      return json({
        attendance: {
          ...rows[0],
          display_name: memberRows[0].display_name,
        },
      }, 201);
    } catch (error) {
      if (pgErrorCode(error) === '23505') {
        throw new HttpError(409, 'That member is already marked present');
      }

      throw error;
    }
  }

  const guestName = asGuestName(body.guestName);

  try {
    const rows = await sql`
      INSERT INTO attendance (session_id, guest_name, source, marked_by)
      VALUES (${id}, ${guestName}, 'admin', ${membership.user_id})
      RETURNING
        id::text AS id,
        member_id::text AS member_id,
        guest_name,
        source,
        finish_time_seconds
    `;

    return json({
      attendance: {
        ...rows[0],
        display_name: rows[0].guest_name,
      },
    }, 201);
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'That guest is already marked present');
    }

    throw error;
  }
}
