import { tokenStorage } from '@/storage/tokenStorage';
import { API_BASE_URL } from './config';
import { ApiError, NetworkRefreshError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Attach the bearer access token and allow 401 refresh-retry. Defaults to true. */
  auth?: boolean;
}

/**
 * Registered by the root layout so the HTTP client can force a logout/redirect
 * when a refresh-token retry also fails (session is truly dead).
 */
let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

// Concurrency guard: simultaneous 401s share a single in-flight refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    console.log('[api] refreshing access token');
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        // No refresh token at all (e.g. logged out) is the one genuinely-terminal case here —
        // there's nothing to retry, the caller's catch forces a real logout.
        console.error('[api] no refresh token in storage — cannot refresh session');
        throw new ApiError(401, 'No refresh token available');
      }

      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (networkErr) {
        // A transient network blip (wifi/cell handoff, no signal) while refreshing is not
        // an auth failure — the refresh token itself is still valid. Don't let this look
        // like "session expired": tag it so request() below can skip the forced logout.
        console.warn('[api] network error while refreshing access token', networkErr);
        throw new NetworkRefreshError();
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Non-OK from the refresh endpoint itself IS a real auth failure (expired/invalid
        // refresh token) — the caller's catch forces logout, so this stays loud.
        console.error('[api] refresh token request failed', { status: res.status, body: json });
        throw new ApiError(res.status, json.error ?? 'Failed to refresh session');
      }

      await tokenStorage.saveAccessToken(json.token);
      console.log('[api] access token refreshed successfully');
      return json.token as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function rawRequest<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions,
  accessTokenOverride?: string
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = accessTokenOverride ?? (await tokenStorage.getAccessToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`[api] -> ${method} ${path}`, { auth: auth && !!headers.Authorization });

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    console.error(`[api] network error on ${method} ${path}`, networkErr);
    throw networkErr;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const rawText = isJson ? await res.text() : undefined;
  let data: unknown;
  try {
    data = rawText ? JSON.parse(rawText) : undefined;
  } catch (parseErr) {
    console.error(`[api] failed to parse JSON response for ${method} ${path}`, { rawText, parseErr });
    data = undefined;
  }

  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error ?? `Request failed with status ${res.status}`;
    // A 401 here is often just an expired access token about to be silently refreshed
    // and retried by request() below — console.error would surface as a RedBox/LogBox
    // error in dev builds even though the user never sees any failure. Real, unrecoverable
    // failures are still logged loudly wherever they end up (the refresh-failure branch
    // below, or the screen's own catch block).
    console.warn(`[api] <- ${res.status} ${method} ${path}`, { body: rawText });
    throw new ApiError(res.status, message);
  }

  console.log(`[api] <- ${res.status} ${method} ${path}`);
  return data as T;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options;

  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || !auth) {
      throw err;
    }

    try {
      const newToken = await refreshAccessToken();
      return await rawRequest<T>(path, options, newToken);
    } catch (refreshErr) {
      if (refreshErr instanceof NetworkRefreshError) {
        // Couldn't reach the server at all — the session is still perfectly valid, just
        // unreachable right now. Not a logout-worthy event; let the caller's own retry/error
        // handling deal with it like any other network failure.
        console.warn('[api] could not refresh session (network unreachable), not logging out', refreshErr);
        throw refreshErr;
      }

      console.error('[api] session expired — refresh failed, forcing logout', refreshErr);
      await tokenStorage.clear();
      sessionExpiredHandler?.();
      throw refreshErr;
    }
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
};
