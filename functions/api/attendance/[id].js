import { HttpError, json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { asId } from '../../_lib/validate.js';

export async function onRequestDelete(context) {
  requireAdmin(context);
  const { env, params } = context;
  const id = asId(params.id, 'Attendance ID');
  const sql = getSql(env);
  const rows = await sql`
    DELETE FROM attendance
    WHERE id = ${id}
    RETURNING id::text AS id
  `;

  if (!rows.length) {
    throw new HttpError(404, 'Attendance record not found');
  }

  return json({ ok: true });
}
