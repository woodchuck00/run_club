import { json } from '../_lib/http.js';
import { clubName, clubTimezone } from '../_lib/config.js';

export async function onRequestGet({ env }) {
  return json({
    clubName: clubName(env),
    timezone: clubTimezone(env),
  });
}
