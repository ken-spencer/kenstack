export function getSafeReturnToPath(value?: string | null) {
  const path = value?.trim();

  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return;
  }

  const pathname = path.split(/[?#]/, 1)[0];

  if (pathname === "/login") {
    return;
  }

  return path;
}
