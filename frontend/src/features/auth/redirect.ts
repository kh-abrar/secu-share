// Where to go after signing in. Kept in sessionStorage rather than a ?next= parameter so
// that share-link keys (in the URL fragment) are never sent to any server.
const KEY = "secushare:after-login";

export function rememberReturnPath(path: string) {
  sessionStorage.setItem(KEY, path);
}

export function takeReturnPath(fallback = "/dashboard"): string {
  const path = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  // Same-origin paths only (no "//host" or "https://..." open redirects)
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
