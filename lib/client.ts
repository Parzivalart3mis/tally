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

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { headers: { Accept: 'application/json' } }));
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiUpload<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  return handle<T>(await fetch(url, { method: 'POST', body: form }));
}
