/** Client-side fetch wrapper that speaks the API's { data } / { error } envelope. */

export interface ApiErrorDetails {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  [key: string]: unknown;
}

export class ClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ClientError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & { json?: unknown };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json, headers, method, ...rest } = options;
  const init: RequestInit = { ...rest };
  init.method = method ?? (json !== undefined ? "POST" : "GET");
  init.headers = { "Content-Type": "application/json", ...(headers ?? {}) };
  if (json !== undefined) init.body = JSON.stringify(json);

  const res = await fetch(path, init);

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response (shouldn't happen for our API, but stay defensive)
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: ApiErrorDetails } } | null)?.error;
    throw new ClientError(
      res.status,
      err?.code ?? "ERROR",
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
    );
  }

  return (body as { data: T }).data;
}
