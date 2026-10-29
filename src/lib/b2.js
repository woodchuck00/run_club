import { api } from './api';

export function b2KeyFromUrl(url) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const marker = '/file/';
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) {
      return '';
    }

    const parts = parsed.pathname.slice(index + marker.length).split('/');
    // Drop the bucket name, keep the remaining object key.
    return parts.slice(1).join('/');
  } catch {
    return '';
  }
}

export async function signB2Url(url) {
  if (!url) {
    return '';
  }

  const key = b2KeyFromUrl(url);

  if (!key) {
    return url;
  }

  try {
    const response = await api(`/auth/me?key=${encodeURIComponent(key)}`);
    return response?.url || url;
  } catch {
    return url;
  }
}
