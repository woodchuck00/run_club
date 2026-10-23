export class ApiError extends Error {
  constructor(message, status = 0, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server');
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith('/auth/login') &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new ApiError(
      data?.error || `Request failed (${response.status})`,
      response.status,
      data?.details,
    );
  }

  return data;
}
