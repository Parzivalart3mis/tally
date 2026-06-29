/** Tiny typed fetch helpers for client components. Throws ApiClientError with
 *  the server's { error: { code, message } } shape on failure. */

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let code = 'error';
  let message = `Request failed (${res.status}).`;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    /* non-JSON error body */
  }
  throw new ApiClientError(res.status, code, message);
}

/**
 * Fetch with backoff retries on a transient 404/401. These statuses mean the
 * request was NOT processed — an edge-cached 404 during the post-deploy
 * propagation window, or a Clerk token mid-refresh — so re-sending cannot
 * double-apply a mutation (no duplicate bills). Spreading retries over ~12s
 * lets a brief post-deploy cache window clear without the user waiting.
 */
/** A freshly-minted Clerk session token for the Authorization header, if Clerk
 *  is loaded. getToken() refreshes a near-expiry token, so the server always
 *  validates a current token instead of a possibly-stale cookie. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const clerk = (
      globalThis as {
        Clerk?: { session?: { getToken?: () => Promise<string | null> } };
      }
    ).Clerk;
    const token = await clerk?.session?.getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function fetchWithRetry(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const delays = [800, 1500, 3000, 6000]; // ~11s across 4 retries
  const attempt = async () => {
    const auth = await authHeader();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...auth,
      },
    });
  };
  let res = await attempt();
  for (const delay of delays) {
    if (res.status !== 404 && res.status !== 401) return res;
    await new Promise((r) => setTimeout(r, delay));
    res = await attempt(); // re-mint a fresh token on each retry
  }
  return res;
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(
    await fetchWithRetry(url, { headers: { Accept: 'application/json' } }),
  );
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return handle<T>(await fetchWithRetry(url, init));
}

export async function apiUpload<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  return handle<T>(await fetchWithRetry(url, { method: 'POST', body: form }));
}
