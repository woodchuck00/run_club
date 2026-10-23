import { HttpError } from './http.js';

export function asString(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length < min) {
    throw new HttpError(400, `${field} must be at least ${min} characters`);
  }

  if (trimmed.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }

  return trimmed;
}

export function asName(value) {
  return asString(value, 'Name', { min: 1, max: 80 });
}

export function asEmail(value) {
  const email = asString(value, 'Email', { min: 3, max: 254 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Email address is not valid');
  }

  return email;
}

export function asOptionalEmail(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return asEmail(value);
}

export function asPassword(value) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }

  if (value.length > 200) {
    throw new HttpError(400, 'Password must be at most 200 characters');
  }

  return value;
}

export function asLoginPassword(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200) {
    throw new HttpError(400, 'Password is required');
  }

  return value;
}

export function asDate(value) {
  const date = asString(value, 'Session date', { min: 10, max: 10 });
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new HttpError(400, 'Session date must use YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, 'Session date is not a valid date');
  }

  return date;
}

export function asId(value, field = 'ID') {
  const id = asString(String(value ?? ''), field, { min: 1, max: 20 });

  if (!/^\d+$/.test(id)) {
    throw new HttpError(400, `${field} is not valid`);
  }

  return id;
}

export function asOptionalTitle(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Title must be text');
  }

  const title = value.trim();

  if (title.length > 120) {
    throw new HttpError(400, 'Title must be at most 120 characters');
  }

  return title || null;
}

export function asGuestName(value) {
  return asString(value, 'Guest name', { min: 1, max: 80 });
}

export function asEnum(value, field, allowed) {
  const option = asString(value, field, { min: 1, max: 30 });

  if (!allowed.includes(option)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  }

  return option;
}

export function parseLimit(value, fallback = 100, max = 200) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}
