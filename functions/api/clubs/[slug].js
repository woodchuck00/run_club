import { HttpError, json, readJson } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import {
  getClubBySlug,
  getClubMembership,
  requireAdmin,
  requireClub,
} from '../../_lib/clubs.js';
import {
  asOptionalDescription,
  asString,
  asTimezone,
} from '../../_lib/validate.js';

export async function onRequestGet({ env, data, params }) {
  const club = await getClubBySlug(env, params.slug);

  if (!club) {
    throw new HttpError(404, 'Club not found');
  }

  const sql = getSql(env);
  const counts = await sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM members
        WHERE club_id = ${club.id}
          AND status = 'active'
      ) AS active_members,
      (
        SELECT COUNT(*)::int
        FROM sessions
        WHERE club_id = ${club.id}
          AND status = 'scheduled'
      ) AS sessions_count
  `;

  const membership = data.user
    ? await getClubMembership(env, club.id, data.user.id)
    : null;

  return json({
    club: {
      ...club,
      ...counts[0],
      joined: Boolean(membership),
    },
    membership,
  });
}

export async function onRequestPatch(context) {
  requireAdmin(context);
  const club = requireClub(context);
  const { request, env, params } = context;

  if (club.slug !== params.slug) {
    throw new HttpError(400, 'Club URL does not match the request');
  }

  const body = await readJson(request);
  const name = body.name === undefined
    ? club.name
    : asString(body.name, 'Club name', { min: 2, max: 80 });
  const description = body.description === undefined
    ? club.description
    : asOptionalDescription(body.description);
  const timezone = body.timezone === undefined
    ? club.timezone
    : asTimezone(body.timezone);
  const sql = getSql(env);
  const rows = await sql`
    UPDATE clubs
    SET name = ${name},
        description = ${description},
        timezone = ${timezone}
    WHERE id = ${club.id}
    RETURNING
      id::text AS id,
      name,
      slug,
      description,
      timezone,
      created_at
  `;

  return json({ club: { ...rows[0], joined: true } });
}
