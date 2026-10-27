import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql, pgErrorCode } from '../../_lib/db.js';
import { requireUser } from '../../_lib/auth.js';
import {
  asOptionalDescription,
  asSlug,
  asString,
  asTimezone,
} from '../../_lib/validate.js';

export async function onRequestGet({ env, data }) {
  const sql = getSql(env);
  const userId = data.user?.id || null;
  const clubs = await sql`
    SELECT
      c.id::text AS id,
      c.name,
      c.slug,
      c.description,
      c.timezone,
      c.created_at,
      (
        SELECT COUNT(*)::int
        FROM members m
        WHERE m.club_id = c.id
          AND m.status = 'active'
      ) AS active_members,
      (
        SELECT COUNT(*)::int
        FROM sessions s
        WHERE s.club_id = c.id
          AND s.status = 'scheduled'
      ) AS sessions_count,
      (
        SELECT m.role
        FROM members m
        WHERE m.club_id = c.id
          AND m.user_id = ${userId}
          AND m.status = 'active'
        LIMIT 1
      ) AS role
    FROM clubs c
    ORDER BY lower(c.name)
  `;

  return json({
    clubs: clubs.map((club) => ({
      ...club,
      joined: Boolean(club.role),
    })),
  });
}

export async function onRequestPost(context) {
  const user = requireUser(context);
  const { request, env } = context;
  const body = await readJson(request);
  const name = asString(body.name, 'Club name', { min: 2, max: 80 });
  const slug = asSlug(body.slug);
  const timezone = asTimezone(body.timezone || 'UTC');
  const description = asOptionalDescription(body.description);
  const sql = getSql(env);

  let club;

  try {
    const rows = await sql`
      WITH new_club AS (
        INSERT INTO clubs (name, slug, description, timezone, created_by)
        VALUES (${name}, ${slug}, ${description}, ${timezone}, ${user.id})
        RETURNING
          id,
          name,
          slug,
          description,
          timezone,
          created_at
      ), new_member AS (
        INSERT INTO members (club_id, user_id, display_name, email, role)
        SELECT id, ${user.id}, ${user.displayName}, ${user.email}, 'admin'
        FROM new_club
        RETURNING id
      )
      SELECT
        c.id::text AS id,
        c.name,
        c.slug,
        c.description,
        c.timezone,
        c.created_at,
        'admin' AS role,
        TRUE AS joined
      FROM new_club c
      CROSS JOIN new_member m
    `;

    club = rows[0];
  } catch (error) {
    if (pgErrorCode(error) === '23505') {
      throw new HttpError(409, 'That club URL is already in use');
    }

    throw error;
  }

  return json({ club }, 201);
}
