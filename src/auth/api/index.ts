import type { NextRequest } from "next/server";
import {
  loadPublicAuthState,
  type PublicAuthState,
} from "@kenstack/auth/server/state";
import { multiPipeline, pipelineStage } from "@kenstack/api";
import ForgotPasswordEmail, {
  attachments as forgotPasswordAttachments,
} from "@kenstack/auth/handlers/forgotPassword/Email";
import {
  createEmailChange,
  type EmailChangeOptions,
} from "@kenstack/auth/email/change/api";
import {
  createEmailLogin,
  type EmailLoginOptions,
} from "@kenstack/auth/email/login/api";
import {
  forgotPasswordPipeline,
  type ForgotPasswordProps,
} from "@kenstack/auth/handlers/forgotPassword";
import { loginPipeline } from "@kenstack/auth/handlers/login";
import { resolveLoginDestination } from "@kenstack/auth/server/loginDestination";
import { logoutPipeline } from "@kenstack/auth/handlers/logout";
import { resetPasswordPipeline } from "@kenstack/auth/handlers/resetPassword";
import { sendOnboardingEmailAction } from "@kenstack/auth/handlers/sendOnboarding";

export type LoginActionResult = {
  authenticated: true;
  authState: PublicAuthState;
  path: string;
};

export type EmailLoginRequestResult =
  | { authState: PublicAuthState; path: string }
  | {
      authState: Extract<PublicAuthState, { state: "code-sent" }>;
      challengeKey: string;
    };

export type EmailLoginVerificationResult = {
  authState: PublicAuthState;
  path: string;
};

export type EmailChangeRequestResult = {
  // The requester stays signed in as the current account until the change
  // is confirmed.
  authState: PublicAuthState;
  challengeKey: string;
  email: string;
};

// Its `userInfo` comes from `returnUser`.
export type EmailChangeVerificationResult = {
  userInfo: UserInfoResult;
};

export type EmailChangeCancelResult = {
  // Named outcome because the fetch envelope owns status.
  outcome: "cancelled" | "completed" | "unknown";
};

export type UserInfoResult = {
  authState: PublicAuthState;
  // Where the login flow's final step leaves for when no returnTo applies; absent without a session.
  loginDestination?: string;
};

export type LogoutResult = {
  path: string;
  // The session that remains, from `returnUser`: logging out while impersonating restores the
  // administrator's own.
  userInfo: UserInfoResult;
};

export const authPipeline = (
  options: {
    // Sign-in email changes for signed-in users; absent, the actions are not
    // registered.
    emailChange?: EmailChangeOptions;
    // Email-login and recovery-link behavior and copy.
    emailLogin?: EmailLoginOptions;
    forgotPassword?: ForgotPasswordProps;
  } = {},
) => {
  const forgotPassword = {
    Email: ForgotPasswordEmail,
    attachments: forgotPasswordAttachments,
    ...options.forgotPassword,
  };
  const emailLogin = createEmailLogin(options.emailLogin);
  const emailChange = options.emailChange
    ? createEmailChange(options.emailChange)
    : undefined;
  return {
    POST: (request: NextRequest) =>
      multiPipeline(
        { request },
        {
          logout: logoutPipeline,
          "user-info": pipelineStage({}, async ({ response }) => {
            response.headers.set("Cache-Control", "no-store");
            const authState = await loadPublicAuthState();
            return response.success<UserInfoResult>({
              authState,
              loginDestination:
                authState.state === "authenticated"
                  ? await resolveLoginDestination(undefined)
                  : undefined,
            });
          }),

          login: loginPipeline,
          "forgot-password": forgotPasswordPipeline(forgotPassword),
          "reset-password": resetPasswordPipeline,

          "email-login": emailLogin.request,
          "verify-email-login-code": emailLogin.verifyCode,
          "verify-email-login-link": emailLogin.verifyLink,

          ...(emailChange
            ? {
                "email-change": emailChange.request,
                "verify-email-change-code": emailChange.verifyCode,
                "verify-email-change-link": emailChange.verifyLink,
                "cancel-email-change": emailChange.cancel,
              }
            : {}),

          "send-onboarding": sendOnboardingEmailAction,
        },
      ),
  };
};
