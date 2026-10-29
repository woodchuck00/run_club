import { HttpError, json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { uploadFileToB2 } from '../../_lib/b2.js';
import { asName, asOptionalBirthdate, asOptionalEnum } from '../../_lib/validate.js';
import { requireUser } from '../../_lib/auth.js';

const SEX_OPTIONS = ['female', 'male', 'non-binary', 'other', 'prefer not to say'];
const MARITAL_STATUS_OPTIONS = [
  'single',
  'married',
  'partnered',
  'divorced',
  'widowed',
  'prefer not to say',
];

function asBoolean(value) {
  return value === 'true' || value === 'on' || value === '1';
}

async function uploadAvatar(file, filename, env) {
  try {
    return await uploadFileToB2(file, `avatars/${filename}`, env);
  } catch (error) {
    throw new HttpError(500, error.message);
  }
}

export async function onRequestPost(context) {
  requireUser(context);
  const { request, env } = context;
  const user = context.data.user;

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    throw new HttpError(400, 'Content-Type must be multipart/form-data or application/x-www-form-urlencoded');
  }

  const formData = await request.formData();
  const bio = formData.get('bio') ?? null;
  const socialLinks = formData.get('socialLinks') ?? null;
  const interests = formData.get('interests') ?? null;
  const music = formData.get('music') ?? null;
  const displayName = asName(formData.get('displayName')) ?? null;
  const email = formData.get('email') || null;
  const birthdate = asOptionalBirthdate(formData.get('birthdate'));
  const sex = asOptionalEnum(formData.get('sex'), 'Sex', SEX_OPTIONS);
  const maritalStatus = asOptionalEnum(
    formData.get('maritalStatus'),
    'Marital status',
    MARITAL_STATUS_OPTIONS,
  );
  const birthdatePublic = asBoolean(formData.get('birthdatePublic'));
  const sexPublic = asBoolean(formData.get('sexPublic'));
  const maritalStatusPublic = asBoolean(formData.get('maritalStatusPublic'));

  let avatarUrl = user.avatarUrl || null;
  if (formData.has('avatar')) {
    const avatarFile = formData.get('avatar');
    if (avatarFile instanceof File) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(avatarFile.type)) {
        throw new HttpError(400, 'Avatar must be a JPEG, PNG, GIF, or WebP image');
      }
      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new HttpError(400, 'Avatar must be at most 5MB');
      }
      const ext = avatarFile.name.split('.').pop();
      const filename = `${crypto.randomUUID()}.${ext}`;
      avatarUrl = await uploadAvatar(avatarFile, filename, env);
    }
  }

  const sql = getSql(env);
  const rows = await sql`
    UPDATE users
    SET bio = ${bio},
        social_links = ${socialLinks},
        interests = ${interests},
        music = ${music},
        display_name = ${displayName},
        email = ${email},
        avatar_url = ${avatarUrl},
        birthdate = ${birthdate},
        sex = ${sex},
        marital_status = ${maritalStatus},
        birthdate_public = ${birthdatePublic},
        sex_public = ${sexPublic},
        marital_status_public = ${maritalStatusPublic}
    WHERE id = ${user.id}
    RETURNING id::text AS id, email, display_name, bio,
              social_links AS socialLinks,
              interests,
              music,
              avatar_url AS avatarUrl,
              display_name AS displayName,
              birthdate, sex,
              marital_status AS "maritalStatus",
              birthdate_public AS "birthdatePublic",
              sex_public AS "sexPublic",
              marital_status_public AS "maritalStatusPublic",
              role, created_at
  `;

  return json({ user: rows[0] });
}
