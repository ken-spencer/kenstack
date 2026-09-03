import "server-only";

import {
  loadAuthState,
  loadFreshPublicAuthState,
  loadPublicAuthState,
} from "@kenstack/auth/server/state";
import {
  checkQuota,
  pipelineStage,
  recaptcha,
  ReturnedError,
} from "@kenstack/api";
import type {
  EmailLoginRequestResult,
  EmailLoginVerificationResult,
} from "@kenstack/auth/api";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import getIp from "@kenstack/lib/ip";

import {
  createVerificationEmail,
  type VerificationEmailCopy,
} from "@kenstack/auth/email/verification/Email";
import { verifyLink } from "@kenstack/auth/email/verification/verifyLink";
import { sendCode } from "@kenstack/auth/email/verification/sendCode";
import { verifyCode } from "@kenstack/auth/email/verification/verifyCode";
import { redeemEmailProof } from "./redeemProof";
import {
  type EmailLoginLinkFailureCode,
  requestEmailLoginSchema,
  verifyEmailLoginCodeSchema,
  verifyEmailLoginLinkSchema,
} from "./schemas";

const emailLoginLinkFailureMessages = {
  expired: "This sign-in link has expired. Request a new email to continue.",
  invalid:
    "This sign-in link is no longer valid. Request a new email to continue.",
  "wrong-account":
    "Sign out of the current account, then open this link again. The link is still valid.",
  "wrong-browser":
    "This link was opened in a different browser. Open it in the browser where you requested it, or request a new email here. The link is still valid.",
} satisfies Record<EmailLoginLinkFailureCode, string>;

export type EmailLoginOptions = {
  allowUnregistered?: boolean;
  email?: Partial<VerificationEmailCopy>;
};

export function createEmailLogin(options: EmailLoginOptions = {}) {
  const config = {
    email: {
      actionLabel: "Sign in",
      heading: "Sign in",
      introduction:
        "Use the button below or enter the six-digit code to sign in.",
      subject: "Sign in",
      ...options.email,
    },
    linkPath: "/login" as const,
  };

  return {
    request: pipelineStage(
      { schema: requestEmailLoginSchema },
      async ({ data, request, response }) => {
        const returnTo = getSafeReturnToPath(data.returnTo);
        const authState = await loadAuthState();
        if (
          authState.state === "authenticated" &&
          authState.email === data.email
        ) {
          response.headers.set("Cache-Control", "no-store");
          return response.success<EmailLoginRequestResult>({
            authState: await loadPublicAuthState(),
            path: returnTo ?? "/",
          });
        }
        if (authState.state === "proven" && authState.email === data.email) {
          await redeemEmailProof(authState, {
            allowUnregistered: options.allowUnregistered,
          });

          response.headers.set("Cache-Control", "no-store");
          // Authentication may have established a session, so the state is
          // reloaded rather than read from the request cache.
          return response.success<EmailLoginRequestResult>({
            authState: await loadFreshPublicAuthState(),
            path: returnTo ?? "/",
          });
        }

        // Cheap quota read before the reCAPTCHA assessment; sendCode still
        // claims atomically before delivery.
        const exceeded = await checkQuota("verification", {
          email: data.email,
          ip: await getIp(request),
        });
        if (exceeded) {
          throw new ReturnedError(exceeded.message, { status: 429 });
        }

        const recaptchaRejection = await recaptcha({
          action: "login",
          request,
          response,
          token: data.recaptchaToken,
        });
        if (recaptchaRejection) {
          return recaptchaRejection;
        }

        const { challengeKey, email } = await sendCode(
          {
            challengeKey: data.challengeKey,
            email: data.email,
            linkPath:
              returnTo && data.linkToReturnTo
                ? returnTo
                : returnTo
                  ? `${config.linkPath}?returnTo=${encodeURIComponent(returnTo)}`
                  : config.linkPath,
            request,
          },
          createVerificationEmail(config.email),
        );

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailLoginRequestResult>({
          authState: { email, state: "code-sent" },
          challengeKey,
        });
      },
    ),
    verifyCode: pipelineStage(
      { schema: verifyEmailLoginCodeSchema },
      async ({ data, response }) => {
        await redeemEmailProof(await verifyCode(data), {
          allowUnregistered: options.allowUnregistered,
        });

        response.headers.set("Cache-Control", "no-store");
        // The client store seeds from this state instead of fetching user-info
        // again; loaded fresh since authentication may have established a session.
        return response.success<EmailLoginVerificationResult>({
          authState: await loadFreshPublicAuthState(),
          path: getSafeReturnToPath(data.returnTo) ?? "/",
        });
      },
    ),
    verifyLink: pipelineStage(
      { schema: verifyEmailLoginLinkSchema },
      async ({ data, response }) => {
        const returnTo = getSafeReturnToPath(data.returnTo);

        const verification = await verifyLink(data.token);
        if (verification.state !== "proven") {
          throw new ReturnedError(
            emailLoginLinkFailureMessages[verification.state],
            {
              code: verification.state,
              status: 409,
            },
          );
        }

        await redeemEmailProof(verification, {
          allowUnregistered: options.allowUnregistered,
        });

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailLoginVerificationResult>({
          authState: await loadFreshPublicAuthState(),
          path: returnTo ?? "/",
        });
      },
    ),
  };
}
