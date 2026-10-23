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

const adminEmail = process.env.ADMIN_EMAIL?.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME?.trim() || 'Club Admin';

if (!adminEmail || !adminPassword) {
  console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set; skipped admin seeding.');
  process.exit(0);
}

if (adminPassword.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const rows = await sql`
  WITH admin_user AS (
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
    RETURNING id, email, name, role
  ), admin_member AS (
    INSERT INTO members (user_id, display_name, email)
    SELECT id, name, email FROM admin_user
    ON CONFLICT (user_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          email = EXCLUDED.email,
          status = 'active'
    RETURNING id
  )
  SELECT id::text AS id, email, name, role FROM admin_user
`;

await sql`DELETE FROM auth_sessions WHERE expires_at < now()`;

console.log(`Admin account ready: ${rows[0].email}`);
