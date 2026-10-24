import { json } from '../../_lib/http.js';
import { getAvatarUrl } from '../../_lib/b2.js';

export async function onRequestGet({ request, data, env }) {
  const key = new URL(request.url).searchParams.get('key');

  if (key) {
    const url = await getAvatarUrl(env, key);
    return json({ url });
  }

  return json({ user: data.user || null });
}