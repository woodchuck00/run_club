import { HttpError, json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { asName } from '../../_lib/validate.js';
import { requireUser } from '../../_lib/auth.js';

async function uploadToB2(file, filename, env) {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_BUCKET_ID } = env;

  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET || !B2_BUCKET_ID) {
    throw new HttpError(500, 'B2 storage not configured. Check env vars.');
  }

  // 1. Authorize to get token + API URLs
  const authHeader = `Basic ${btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)}`;
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: authHeader },
  });
  if (!authRes.ok) {
    throw new HttpError(500, `B2 authorize failed: ${authRes.statusText}`);
  }
  const { apiUrl, downloadUrl, authorizationToken } = await authRes.json();

  // 2. Get upload URL (pass bucketId in JSON body)
  const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });
  if (!uploadUrlRes.ok) {
    throw new HttpError(500, `Failed to get B2 upload URL: ${uploadUrlRes.statusText}`);
  }
  const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

  // 3. Upload the file
  const key = `avatars/${filename}`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadToken,
      'X-Bz-File-Name': key,
      'Content-Type': file.type || 'application/octet-stream',
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: await file.arrayBuffer(),
  });
  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    console.log('B2 upload failed:', uploadRes.status, errBody);
    throw new HttpError(500, `B2 upload failed: ${uploadRes.status} ${errBody}`);
  }

  // 4. Return the public file URL
  return `${downloadUrl}/file/${B2_BUCKET}/${key}`;
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
  const displayName = asName(formData.get('displayName')) ?? null;
  const email = formData.get('email') || null;

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
      avatarUrl = await uploadToB2(avatarFile, filename, env);
    }
  }

  const sql = getSql(env);
  const rows = await sql`
    UPDATE users
    SET bio = ${bio},
        social_links = ${socialLinks},
        display_name = ${displayName},
        email = ${email},
        avatar_url = ${avatarUrl}
    WHERE id = ${user.id}
    RETURNING id::text AS id, email, display_name, bio,
              social_links AS socialLinks,
              avatar_url AS avatarUrl,
              display_name AS displayName,
              role, created_at
  `;

  return json({ user: rows[0] });
}   