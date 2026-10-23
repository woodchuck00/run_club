import { json } from '../_lib/http.js';

export async function onRequest() {
  return json({ error: 'API route not found' }, 404);
}
