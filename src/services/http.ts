/**
 * Thin typed wrapper around `fetch` for the browser-side API clients.
 *
 * Exists so components never touch `fetch` directly (engineering rule 1-D) and
 * so every caller handles failure the same way: the server's `{ success, error }`
 * envelope is unwrapped here and turned into a thrown `ApiRequestError`, letting
 * call sites use plain try/catch instead of re-checking `data.success` each time.
 */

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

type Payload = Record<string, unknown> | undefined;

async function request<T>(method: string, url: string, body?: Payload): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure — no response to read a message from.
    throw new ApiRequestError(
      "Unable to reach the server. Check your connection and try again.",
      0
    );
  }

  // A non-JSON body means an infrastructure error page rather than our envelope.
  let data: { success?: boolean; error?: string; details?: unknown } & Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new ApiRequestError(
      response.ok ? "The server returned an unreadable response." : response.statusText,
      response.status
    );
  }

  if (!response.ok || data.success === false) {
    throw new ApiRequestError(
      data.error || "The request could not be completed.",
      response.status,
      data.details
    );
  }

  return data as T;
}

export const http = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: Payload) => request<T>("POST", url, body),
  put: <T>(url: string, body?: Payload) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: Payload) => request<T>("PATCH", url, body),
  delete: <T>(url: string, body?: Payload) => request<T>("DELETE", url, body),
};

/** Narrows an unknown catch binding to a message safe to show the user. */
export function toErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
