import { NextResponse } from 'next/server';
import { ZodError, type z } from 'zod';

/** Error shape returned by every route: { error: { code, message } }. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const errors = {
  unauthorized: () => new ApiError(401, 'unauthorized', 'Sign in to continue.'),
  forbidden: () => new ApiError(403, 'forbidden', 'Not allowed.'),
  notFound: (what = 'Resource') =>
    new ApiError(404, 'not_found', `${what} not found.`),
  badRequest: (message = 'Invalid request.') =>
    new ApiError(400, 'bad_request', message),
  rateLimited: () =>
    new ApiError(429, 'rate_limited', 'Too many requests. Slow down a moment.'),
  payload: (message: string) => new ApiError(413, 'payload_too_large', message),
  upstream: (message = 'A model call failed.') =>
    new ApiError(502, 'upstream_error', message),
  server: (message = 'Something went wrong.') =>
    new ApiError(500, 'server_error', message),
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(err: ApiError) {
  return NextResponse.json(
    { error: { code: err.code, message: err.message } },
    { status: err.status },
  );
}

/** Wrap a route handler so thrown ApiError / ZodError become the error shape. */
export function route<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err);
      if (err instanceof ZodError) {
        const first = err.errors[0];
        const message = first
          ? `${first.path.join('.') || 'body'}: ${first.message}`
          : 'Validation failed.';
        return jsonError(new ApiError(400, 'validation_error', message));
      }
      console.error('[route error]', err);
      return jsonError(errors.server());
    }
  };
}

/** Parse + validate a JSON body, throwing a 400 ApiError on bad input.
 *  Uses the schema's OUTPUT type so `.default()` / `.transform()` are honored. */
export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw errors.badRequest('Body must be valid JSON.');
  }
  return schema.parse(body);
}
