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

export function asSlug(value) {
  const slug = asString(value, 'Club URL', { min: 2, max: 60 }).toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new HttpError(
      400,
      'Club URL must use lowercase letters, numbers, and single hyphens',
    );
  }

  return slug;
}

export function asTimezone(value) {
  const timezone = asString(value, 'Timezone', { min: 1, max: 64 });

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new HttpError(400, 'Timezone is not valid');
  }

  return timezone;
}

export function asOptionalDescription(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Description must be text');
  }

  const description = value.trim();

  if (description.length > 280) {
    throw new HttpError(400, 'Description must be at most 280 characters');
  }

  return description || null;
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

export function asOptionalEnum(value, field, allowed) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return asEnum(value, field, allowed);
}

export function asOptionalBirthdate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const birthdate = asString(value, 'Birthdate', { min: 10, max: 10 });
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);

  if (!match) {
    throw new HttpError(400, 'Birthdate must use YYYY-MM-DD');
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
    throw new HttpError(400, 'Birthdate is not a valid date');
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  if (parsed.getTime() > todayUtc) {
    throw new HttpError(400, 'Birthdate cannot be in the future');
  }

  if (year < 1900) {
    throw new HttpError(400, 'Birthdate must be after 1900');
  }

  return birthdate;
}

export function asOptionalText(value, max = 1000, field = 'Field') {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be text`);
  }

  const text = value.trim();

  if (text.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }

  return text || null;
}

export function asFinishTimeSeconds(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0 || value >= 86400) {
      throw new HttpError(400, 'Finish time must be a valid number of seconds');
    }

    return value;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Finish time must be text');
  }

  const parts = value.trim().split(':');

  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    throw new HttpError(400, 'Finish time must look like MM:SS or H:MM:SS');
  }

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = parts.length === 3
    ? numbers
    : [0, numbers[0], numbers[1]];

  if (minutes > 59 || seconds > 59) {
    throw new HttpError(400, 'Finish time minutes and seconds must be below 60');
  }

  const total = (hours * 3600) + (minutes * 60) + seconds;

  if (total <= 0) {
    throw new HttpError(400, 'Finish time must be greater than zero');
  }

  if (total >= 86400) {
    throw new HttpError(400, 'Finish time must be under 24 hours');
  }

  return total;
}

export function asOptionalJsonb(value, maxKeys = 10) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'object') {
    throw new HttpError(400, 'Field must be JSON');
  }

  if (Object.keys(value).length > maxKeys) {
    throw new HttpError(400, `Field must not contain more than ${maxKeys} keys`);
  }

  return JSON.stringify(value);
}

export function parseLimit(value, defaultValue = 20) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? defaultValue : Math.max(1, n);
}
