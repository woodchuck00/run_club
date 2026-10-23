import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.js';

let cachedSql = null;
let cachedUrl = null;

export function pgErrorCode(error) {
  return error?.code || error?.cause?.code || '';
}

export function getSql(env) {
  const url = env.DATABASE_URL;

  if (!url) {
    throw new HttpError(500, 'Database is not configured');
  }

  if (!cachedSql || cachedUrl !== url) {
    cachedSql = neon(url);
    cachedUrl = url;
  }

  return cachedSql;
}
