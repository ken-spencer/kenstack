"use client";

import { type ReactNode } from "react";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export default function RecaptchaProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    throw Error(`NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required for recaptcha`);
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
