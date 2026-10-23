CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_meta (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS clubs (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  timezone text NOT NULL DEFAULT 'UTC',
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_lower_uidx ON clubs (lower(slug));
CREATE INDEX IF NOT EXISTS clubs_name_idx ON clubs (lower(name));

CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY,
  club_id bigint REFERENCES clubs(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE members ADD COLUMN IF NOT EXISTS club_id bigint REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_key;
DROP INDEX IF EXISTS members_email_lower_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS members_club_user_uidx
  ON members (club_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_club_email_lower_uidx
  ON members (club_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS members_club_status_idx ON members (club_id, status);
CREATE INDEX IF NOT EXISTS members_status_idx ON members (status);

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY,
  club_id bigint REFERENCES clubs(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS club_id bigint REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_club_date_uidx ON sessions (club_id, session_date);
CREATE INDEX IF NOT EXISTS sessions_club_date_idx ON sessions (club_id, session_date DESC);
CREATE INDEX IF NOT EXISTS sessions_date_idx ON sessions (session_date DESC);

CREATE TABLE IF NOT EXISTS attendance (
  id bigserial PRIMARY KEY,
  session_id bigint NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id bigint REFERENCES members(id),
  guest_name text,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'self')),
  marked_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_exactly_one CHECK ((member_id IS NOT NULL) <> (guest_name IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_member_uidx
  ON attendance (session_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_guest_uidx
  ON attendance (session_id, lower(guest_name))
  WHERE guest_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS attendance_session_idx ON attendance (session_id);
CREATE INDEX IF NOT EXISTS attendance_member_idx ON attendance (member_id);
