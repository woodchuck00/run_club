import { HttpError, json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { asId } from '../../_lib/validate.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = asId(params.id, 'User ID');
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      u.id::text AS id,
      u.display_name,
      u.bio,
      u.social_links,
      u.avatar_url,
      u.created_at
    FROM users u
    WHERE u.id = ${id}
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return json({ user });
}
