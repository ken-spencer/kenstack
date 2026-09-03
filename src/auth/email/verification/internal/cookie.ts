import "server-only";

import { cookies } from "next/headers";

export const verificationCookie = "verification";

export async function getVerificationKey() {
  return (await cookies()).get(verificationCookie)?.value;
}

export async function setVerificationCookie(
  verificationKey: string,
  expiresAt: Date,
) {
  (await cookies()).set(verificationCookie, verificationKey, {
    httpOnly: true,
    maxAge: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1_000)),
    path: "/",
    sameSite: "lax",
    secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production",
  });
}
