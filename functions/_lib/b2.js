export async function getAvatarUrl(env, key) {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET } = env;

  const authHeader = `Basic ${btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)}`;
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: authHeader },
  });
  if (!authRes.ok) {
    throw new Error('B2 authorize failed');
  }
  const { apiUrl, downloadUrl, authorizationToken } = await authRes.json();

  const authUrlRes = await fetch(
    `${apiUrl}/b2api/v2/b2_get_download_authorization?bucketId=${env.B2_BUCKET_ID}&fileNamePrefix=${encodeURIComponent(key)}&validDurationInSeconds=3600`,
    {
      headers: { Authorization: authorizationToken },
    }
  );
  if (!authUrlRes.ok) {
    throw new Error('B2 download authorization failed');
  }
  const { authorizationToken: downloadToken } = await authUrlRes.json();

  return `${downloadUrl}/file/${B2_BUCKET}/${key}?Authorization=${downloadToken}`;
}

export async function uploadFileToB2(file, key, env) {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_BUCKET_ID } = env;

  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET || !B2_BUCKET_ID) {
    throw new Error('B2 storage not configured. Check env vars.');
  }

  // 1. Authorize to get token + API URLs
  const authHeader = `Basic ${btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)}`;
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: authHeader },
  });
  if (!authRes.ok) {
    throw new Error(`B2 authorize failed: ${authRes.statusText}`);
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
    throw new Error(`Failed to get B2 upload URL: ${uploadUrlRes.statusText}`);
  }
  const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

  // 3. Upload the file
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
    throw new Error(`B2 upload failed: ${uploadRes.status} ${errBody}`);
  }

  // 4. Return the public file URL
  return `${downloadUrl}/file/${B2_BUCKET}/${key}`;
}
