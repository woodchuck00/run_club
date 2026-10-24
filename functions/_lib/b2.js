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
