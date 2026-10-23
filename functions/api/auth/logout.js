import { json } from '../../_lib/http.js';
import {
  clearedSessionCookie,
  deleteSession,
} from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  await deleteSession(request, env);

  return json({ ok: true }, 200, {
    'Set-Cookie': clearedSessionCookie(request),
  });
}
