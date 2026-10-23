export function clubName(env) {
  return env.CLUB_NAME?.trim() || 'Run Club';
}

export function clubTimezone(env) {
  const timezone = env.CLUB_TIMEZONE?.trim() || 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return timezone;
  } catch {
    return 'UTC';
  }
}
