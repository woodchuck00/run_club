CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY,
  user_id bigint UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS members_email_lower_uidx
  ON members (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS members_status_idx ON members (status);

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY,
  session_date date NOT NULL UNIQUE,
  title text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
