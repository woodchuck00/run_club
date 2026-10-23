import { HttpError, json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { requireAdmin, requireClub } from '../../_lib/clubs.js';
import { asId } from '../../_lib/validate.js';

export async function onRequestDelete(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { env, params } = context;
  const id = asId(params.id, 'Attendance ID');
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM attendance a
    USING sessions s
    WHERE a.id = ${id}
      AND a.session_id = s.id
      AND s.club_id = ${club.id}
    RETURNING a.id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'Attendance record not found');
  }

  return json({ ok: true });
}
