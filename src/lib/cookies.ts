export function getCookie(name: string) {
  const encodedName = encodeURIComponent(name) + "=";
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!cookie) {
    return;
  }

  const value = cookie.slice(encodedName.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function deleteCookie(name: string, path?: string) {
  document.cookie =
    encodeURIComponent(name) + "=; Max-Age=0" + (path ? `; Path=${path}` : "");
}
