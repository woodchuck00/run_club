import { HttpError, json } from '../../../_lib/http.js';
import { getSql, pgErrorCode } from '../../../_lib/db.js';
import { requireUser } from '../../../_lib/auth.js';
import {
  getClubBySlug,
  getClubMembership,
} from '../../../_lib/clubs.js';

export async function onRequestPost(context) {
  const user = requireUser(context);
  const { env, params } = context;
  const club = await getClubBySlug(env, params.slug);

  if (!club) {
    throw new HttpError(404, 'Club not found');
  }

  const existing = await getClubMembership(env, club.id, user.id);
  const sql = getSql(env);

  if (existing) {
    if (existing.status === 'active') {
      return json({ club, membership: existing });
    }

    const reactivated = await sql`
      UPDATE members
      SET status = 'active',
          role = 'member'
      WHERE id = ${existing.id}
      RETURNING
        id::text AS id,
        club_id::text AS club_id,
        user_id::text AS user_id,
        display_name,
        email,
        role,
        status,
        created_at
    `;

    return json({ club, membership: reactivated[0] });
  }

  const linkedRows = await sql`
    UPDATE members
    SET user_id = ${user.id}
    WHERE club_id = ${club.id}
      AND user_id IS NULL
      AND lower(email) = ${user.email}
    RETURNING
      id::text AS id,
      club_id::text AS club_id,
      user_id::text AS user_id,
      display_name,
      email,
      role,
      status,
      created_at
  `;

  if (linkedRows.length) {
    return json({ club, membership: linkedRows[0] }, 201);
  }

  try {
    const rows = await sql`
      INSERT INTO members (club_id, user_id, display_name, email)
      VALUES (${club.id}, ${user.id}, ${user.name}, ${user.email})
      RETURNING
        id::text AS id,
        club_id::text AS club_id,
        user_id::text AS user_id,
        display_name,
        email,
        role,
        status,
        created_at
    `;

    return json({ club, membership: rows[0] }, 201);
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      const raced = await getClubMembership(env, club.id, user.id);

      if (raced) {
        return json({ club, membership: raced });
      }

      throw new HttpError(409, 'This club already has a roster member with your email');
    }

    throw error;
  }
}
