export default function RecaptchaTOC() {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) {
    return null;
  }

  return (
    <div className="text-gray-400">
      This site is protected by reCAPTCHA and the Google{" "}
      <a href="https://policies.google.com/privacy">Privacy Policy</a> and{" "}
      <a href="https://policies.google.com/terms">Terms of Service</a> apply.
    </div>
  );
}
