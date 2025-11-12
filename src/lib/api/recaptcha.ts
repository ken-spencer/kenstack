import { hasRole } from "../auth";

type RecaptchaOptions = {
  /** name of the field in `data` that holds the token */
  field?: string;
  threshold?: number;
};

type RecaptchaVerifyResponse = {
  success: boolean;
  score: number;
  [k: string]: unknown;
};

import type { PipelineAction } from "@kenstack/lib/api";

const recaptcha =
  ({
    field = "recaptchaToken",
    threshold = 0.5,
  }: RecaptchaOptions = {}): PipelineAction =>
  async ({ dataIn, data, response }) => {
    if (await hasRole(["AUTHENTICATED"])) {
      /** Skip recaptcha if logged in */
      return;
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      throw new Error("RECAPTCHA_SECRET_KEY environment variable is not set");
    }

    const token = dataIn[field];
    if (!token || typeof token !== "string") {
      return response.error(`Recaptcha token field "${field}" is required`);
    }

    const verificationRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      }
    );

    if (!verificationRes.ok) {
      return response.error("Problem connecting to Recaptcha");
    }

    const verification =
      (await verificationRes.json()) as RecaptchaVerifyResponse;

    if (!verification.success || (verification.score ?? 0) < threshold) {
      /** Sanitize the data before logging */
      const logData = typeof data === "object" ? { ...data } : {};
      for (const f of ["password", "confirmPassword"]) {
        if (f in logData) {
          logData[f] = "* * * * * * * *";
        }
      }
      // eslint-disable-next-line no-console
      console.error("Recaptcha failed:", verification, logData);
      return response.error("Couldn’t verify you’re human. Please try again.");
    }

    // on success, just fall through
  };

export default recaptcha;
