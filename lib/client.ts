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
 * Fetch with a single retry on a transient 404/401. These statuses mean the
 * request was not processed — either an edge-cached 404 or a Clerk session
 * token mid-refresh — so re-sending cannot double-apply a mutation. A short
 * delay gives Clerk's client time to refresh the token.
 */
async function fetchWithRetry(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 404 && res.status !== 401) return res;
  await new Promise((r) => setTimeout(r, 700));
  return fetch(input, init);
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
