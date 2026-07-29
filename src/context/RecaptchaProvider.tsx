"use client";

import { type ReactNode } from "react";

import {
  GoogleReCaptchaContext,
  GoogleReCaptchaProvider,
} from "react-google-recaptcha-v3";

export default function RecaptchaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();

  return (
    <>
      <style>{".grecaptcha-badge { visibility: hidden !important; }"}</style>
      {siteKey ? (
        <GoogleReCaptchaProvider reCaptchaKey={siteKey} useRecaptchaNet>
          {children}
        </GoogleReCaptchaProvider>
      ) : (
        <GoogleReCaptchaContext.Provider value={{}}>
          {children}
        </GoogleReCaptchaContext.Provider>
      )}
    </>
  );
}
