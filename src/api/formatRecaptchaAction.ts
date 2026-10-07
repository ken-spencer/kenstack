// reCAPTCHA action names allow only letters, digits, underscores and slashes, so an action's hyphens
// become underscores. The browser's token and the server's check both use this, so they always agree.
export function formatRecaptchaAction(name: string) {
  return name.replaceAll("-", "_");
}
