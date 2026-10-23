import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Add it to .dev.vars or the environment.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const schema = await readFile(schemaPath, 'utf8');
const statements = schema
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

console.log('Database schema applied.');

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validTimezone(value) {
  const timezone = String(value || '').trim() || 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return timezone;
  } catch {
    return 'UTC';
  }
}

const clubName = process.env.CLUB_NAME?.trim() || 'Run Club';
const clubSlug = normalizeSlug(process.env.CLUB_SLUG) || 'run-club';
const clubTimezone = validTimezone(process.env.CLUB_TIMEZONE);

const clubRows = await sql`
  INSERT INTO clubs (name, slug, timezone)
  VALUES (${clubName}, ${clubSlug}, ${clubTimezone})
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        timezone = EXCLUDED.timezone
  RETURNING id::text AS id, name, slug, timezone
`;

const club = clubRows[0];

await sql`UPDATE members SET club_id = ${club.id} WHERE club_id IS NULL`;
await sql`UPDATE sessions SET club_id = ${club.id} WHERE club_id IS NULL`;
await sql`ALTER TABLE members ALTER COLUMN club_id SET NOT NULL`;
await sql`ALTER TABLE sessions ALTER COLUMN club_id SET NOT NULL`;

const roleMigrationRows = await sql`
  SELECT value
  FROM app_meta
  WHERE key = 'multi_club_roles'
  LIMIT 1
`;

if (!roleMigrationRows.length) {
  await sql`
    UPDATE members m
    SET role = 'admin'
    FROM users u
    WHERE m.user_id = u.id
      AND u.role = 'admin'
  `;

  await sql`
    INSERT INTO app_meta (key, value)
    VALUES ('multi_club_roles', 'done')
    ON CONFLICT (key) DO NOTHING
  `;
}

const adminEmail = process.env.ADMIN_EMAIL?.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME?.trim() || 'Club Admin';

if (!adminEmail || !adminPassword) {
  console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set; skipped admin seeding.');
  console.log(`Default club ready: ${club.name} (/c/${club.slug})`);
  process.exit(0);
}

if (adminPassword.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const adminRows = await sql`
  INSERT INTO users (email, name, password_hash, role)
  VALUES (
    ${adminEmail.toLowerCase()},
    ${adminName},
    crypt(${adminPassword}, gen_salt('bf', 12)),
    'admin'
  )
  ON CONFLICT (lower(email)) DO UPDATE
    SET name = EXCLUDED.name,
        role = 'admin',
        password_hash = EXCLUDED.password_hash
  RETURNING id::text AS id, email, name
`;

const admin = adminRows[0];

const linkedRows = await sql`
  UPDATE members
  SET user_id = ${admin.id},
      display_name = ${admin.name},
      email = ${admin.email},
      role = 'admin',
      status = 'active'
  WHERE club_id = ${club.id}
    AND user_id IS NULL
    AND lower(email) = ${admin.email}
  RETURNING id::text AS id
`;

if (!linkedRows.length) {
  const memberRows = await sql`
    SELECT id::text AS id
    FROM members
    WHERE club_id = ${club.id}
      AND user_id = ${admin.id}
    LIMIT 1
  `;

  if (memberRows.length) {
    await sql`
      UPDATE members
      SET display_name = ${admin.name},
          email = ${admin.email},
          role = 'admin',
          status = 'active'
      WHERE id = ${memberRows[0].id}
    `;
  } else {
    await sql`
      INSERT INTO members (club_id, user_id, display_name, email, role)
      VALUES (${club.id}, ${admin.id}, ${admin.name}, ${admin.email}, 'admin')
    `;
  }
}

await sql`DELETE FROM auth_sessions WHERE expires_at < now()`;

console.log(`Admin account ready: ${admin.email}`);
console.log(`Default club ready: ${club.name} (/c/${club.slug})`);
