import axios, { isAxiosError } from "axios";

/**
 * API client. Defaults to same-origin "/api" (Vite dev proxy, bundled nginx);
 * set VITE_API_URL when the API is hosted elsewhere.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

let onUnauthorized: (() => void) | null = null;

/** Called when an authenticated request comes back 401 (session expired). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Requests made with responseType "blob" receive JSON error bodies as blobs
    const data = error.response?.data;
    if (data instanceof Blob && data.type.includes("json")) {
      try {
        error.response.data = JSON.parse(await data.text());
      } catch {
        // leave as-is
      }
    }
    const url = String(error.config?.url ?? "");
    // Auth and public-link endpoints use 401 for "wrong credentials", not "session expired"
    const expected = url.startsWith("/auth/") || url.startsWith("/public/");
    if (error.response?.status === 401 && !expected) onUnauthorized?.();
    return Promise.reject(error);
  }
);

/** Human-readable message from an API or runtime error. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (isAxiosError(err)) {
    if (!err.response) return "Can't reach the server. Check your connection.";
    const data = err.response.data as { message?: string } | Blob | undefined;
    if (data && !(data instanceof Blob) && data.message) return data.message;
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Machine-readable reason attached to some API errors (e.g. "password_required"). */
export function errorReason(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data as { details?: { reason?: string } } | undefined;
  return data?.details?.reason;
}

export default api;
