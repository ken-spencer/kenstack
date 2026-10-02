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
import {
  getLoginReturnPath,
  getSafeReturnToPath,
} from "@kenstack/auth/returnTo";
import { resolveLoginDestination } from "@kenstack/auth/server/loginDestination";
import getIp from "@kenstack/lib/ip";
import { getCurrentSession } from "@kenstack/auth/server/user";
import { hasRecentAuthentication } from "@kenstack/auth/reauthentication";

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
  "wrong-browser":
    "Sign-in links only work in the browser that requested them. To sign in here, request a new link.",
} satisfies Record<EmailLoginLinkFailureCode, string>;

export type EmailLoginOptions = {
  allowUnregistered?: boolean;
  email?: Partial<VerificationEmailCopy>;
};

export function createEmailLogin(options: EmailLoginOptions = {}) {
  const heading = options.email?.heading ?? "Sign in";
  const config = {
    email: {
      actionLabel: heading,
      heading,
      introduction: "Enter this six-digit code to continue.",
      subject: heading,
      ...options.email,
    },
  };

  return {
    request: pipelineStage(
      { schema: requestEmailLoginSchema },
      async ({ data, dataIn, request, response }) => {
        const returnTo = getSafeReturnToPath(data.returnTo);
        const authState = await loadAuthState();
        // A confirmation always sends its code: its button promises one, and must never replay the
        // held request itself.
        if (
          !data.confirmation &&
          authState.state === "authenticated" &&
          authState.email === data.email &&
          hasRecentAuthentication(await getCurrentSession())
        ) {
          const publicAuthState = await loadPublicAuthState();
          response.headers.set("Cache-Control", "no-store");
          return response.success<EmailLoginRequestResult>({
            authState: publicAuthState,
            path: await resolveLoginDestination(returnTo),
          });
        }
        if (authState.state === "proven" && authState.email === data.email) {
          await redeemEmailProof({
            allowUnregistered: options.allowUnregistered,
          });

          // Authentication may have established a session, so the state is
          // reloaded rather than read from the request cache.
          const publicAuthState = await loadFreshPublicAuthState();
          response.headers.set("Cache-Control", "no-store");
          return response.success<EmailLoginRequestResult>({
            authState: publicAuthState,
            path: await resolveLoginDestination(returnTo),
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
          body: dataIn,
          request,
          response,
        });
        if (recaptchaRejection) {
          return recaptchaRejection;
        }

        const { challengeKey, email } = await sendCode(
          {
            challengeKey: data.challengeKey,
            email: data.email,
            linkPath:
              (data.linkToReturnTo
                ? getSafeReturnToPath(data.returnTo, { allowLogin: true })
                : undefined) ?? getLoginReturnPath(returnTo),
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
        await verifyCode({
          challengeKey: data.challengeKey,
          code: data.code,
        });
        await redeemEmailProof({
          allowUnregistered: options.allowUnregistered,
        });

        // The client store seeds from this state instead of fetching user-info
        // again; loaded fresh since authentication may have established a session.
        const publicAuthState = await loadFreshPublicAuthState();
        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailLoginVerificationResult>({
          authState: publicAuthState,
          path: await resolveLoginDestination(data.returnTo),
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

        await redeemEmailProof({
          allowUnregistered: options.allowUnregistered,
        });

        const publicAuthState = await loadFreshPublicAuthState();
        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailLoginVerificationResult>({
          authState: publicAuthState,
          path: await resolveLoginDestination(returnTo),
        });
      },
    ),
  };
}
