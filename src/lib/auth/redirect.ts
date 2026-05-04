const AUTH_REDIRECT_PATHS = new Set(["/login", "/signup"]);

export function isSafeRelativePath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function normalizePostAuthRedirect(
  path: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!isSafeRelativePath(path)) {
    return fallback;
  }

  const [pathname] = path.split(/[?#]/, 1);

  if (!pathname || pathname === "/" || AUTH_REDIRECT_PATHS.has(pathname)) {
    return fallback;
  }

  return path;
}
