import { HttpError } from './http.js';
import { getSql } from './db.js';
import { requireUser } from './auth.js';

export function clubSlugFromRequest(request) {
  return (request.headers.get('X-Club-Slug') || '').trim().toLowerCase();
}

export async function getClubBySlug(env, slug) {
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      name,
      slug,
      description,
      timezone,
      image_url AS "imageUrl",
      social_links AS "socialLinks",
      map_image_url AS "mapImageUrl",
      waiver,
      zip_code AS "zipCode",
      created_at
    FROM clubs
    WHERE lower(slug) = lower(${slug})
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function getClubMembership(env, clubId, userId) {
  const sql = getSql(env);
  const rows = await sql`
    SELECT
      id::text AS id,
      club_id::text AS club_id,
      user_id::text AS user_id,
      display_name,
      email,
      role,
      status,
      created_at
    FROM members
    WHERE club_id = ${clubId}
      AND user_id = ${userId}
    LIMIT 1
  `;

  return rows[0] || null;
}

export function requireClub(context) {
  if (!context.data.club) {
    throw new HttpError(400, 'Club context is required');
  }

  return context.data.club;
}

export function requireMembership(context) {
  requireUser(context);
  const club = requireClub(context);

  if (!context.data.membership || context.data.membership.status !== 'active') {
    throw new HttpError(403, `You are not an active member of ${club.name}`);
  }

  return context.data.membership;
}

export function requireAdmin(context) {
  const membership = requireMembership(context);

  if (membership.role !== 'admin' || membership.status !== 'active') {
    throw new HttpError(403, 'Admin access required');
  }

  return membership;
}
