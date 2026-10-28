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
      u.interests,
      u.music,
      u.avatar_url,
      CASE
        WHEN u.birthdate_public
        THEN EXTRACT(YEAR FROM age(u.birthdate))::int
      END AS age,
      CASE WHEN u.sex_public THEN u.sex END AS sex,
      CASE WHEN u.marital_status_public THEN u.marital_status END AS marital_status,
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
