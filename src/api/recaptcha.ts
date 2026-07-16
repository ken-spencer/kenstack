import { deps } from "@app/deps";

type RecaptchaOptions = {
  /** name of the field in `data` that holds the token */
  field?: string;
  /** action name passed to executeRecaptcha */
  expectedAction?: string;
  threshold?: number;
};

type RecaptchaVerifyResponse = {
  action?: string;
  success: boolean;
  score: number;
  [k: string]: unknown;
};

import { pipelineStage } from "@kenstack/api";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRecaptchaConfig = () => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();

  if (siteKey && secretKey) {
    return secretKey;
  }

  if (!siteKey && !secretKey) {
    return;
  }

  if (!siteKey) {
    return {
      message: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required for recaptcha",
    };
  }

  return {
    message: "RECAPTCHA_SECRET_KEY environment variable is not set",
  };
};

const recaptcha = ({
  expectedAction,
  field = "recaptchaToken",
  threshold = 0.5,
}: RecaptchaOptions = {}) =>
  pipelineStage({}, async ({ dataIn, response }) => {
    if (await deps.auth.getCurrentUser()) {
      /** Skip recaptcha if logged in */
      return;
    }

    const config = getRecaptchaConfig();

    if (!config) {
      return;
    }

    if (typeof config !== "string") {
      return response.error(config.message);
    }

    const token = isObject(dataIn) && dataIn[field];
    if (!token || typeof token !== "string") {
      return response.error(`Recaptcha token field "${field}" is required`);
    }

    const verificationRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(config)}&response=${encodeURIComponent(token)}`,
      },
    );

    if (!verificationRes.ok) {
      return response.error("Problem connecting to Recaptcha");
    }

    const verification =
      (await verificationRes.json()) as RecaptchaVerifyResponse;

    if (
      !verification.success ||
      (verification.score ?? 0) < threshold ||
      (expectedAction && verification.action !== expectedAction)
    ) {
      /** Sanitize the data before logging */
      const logData = typeof dataIn === "object" ? { ...dataIn } : {};
      for (const f of ["password", "passwordHash", "confirmPassword"]) {
        if (f in logData) {
          logData[f] = "* * * * * * * *";
        }
      }
      // eslint-disable-next-line no-console
      console.error("Recaptcha failed:", verification, logData);
      return response.error("Couldn’t verify you’re human. Please try again.");
    }

    // on success, just fall through
  });

export default recaptcha;
