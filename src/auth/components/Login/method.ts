export const loginMethodCookie = "loginMethod";

export type LoginMethod = "email" | "password";

export function rememberLoginMethod(method: LoginMethod) {
  document.cookie = `${loginMethodCookie}=${method}; path=/; max-age=31536000; samesite=lax`;
}
