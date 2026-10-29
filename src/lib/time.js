const MAX_SECONDS = 86399;

export function parseFinishTime(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const parts = value.trim().split(':');

  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    return null;
  }

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = parts.length === 3
    ? numbers
    : [0, numbers[0], numbers[1]];

  if (minutes > 59 || seconds > 59) {
    return null;
  }

  const total = (hours * 3600) + (minutes * 60) + seconds;

  if (total <= 0 || total > MAX_SECONDS) {
    return null;
  }

  return total;
}

export function formatFinishTime(seconds) {
  const total = Number(seconds);

  if (!Number.isFinite(total) || total <= 0) {
    return '';
  }

  const whole = Math.floor(total);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remaining = whole % 60;
  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remaining)}`;
  }

  return `${minutes}:${pad(remaining)}`;
}
