import type { NextRequest } from "next/server";
import {
  loadPublicAuthState,
  type PublicAuthState,
} from "@kenstack/auth/server/state";
import { multiPipeline, pipeline, pipelineStage } from "@kenstack/api";
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
import { logoutPipeline } from "@kenstack/auth/handlers/logout";
import { resetPasswordPipeline } from "@kenstack/auth/handlers/resetPassword";
import { sendOnboardingEmailAction } from "@kenstack/auth/handlers/sendOnboarding";
import type { LoginDestination } from "@kenstack/auth/returnTo";

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

export type EmailChangeVerificationResult = {
  authState: PublicAuthState;
};

export type EmailChangeCancelResult = {
  // Named outcome because the fetch envelope owns status.
  outcome: "cancelled" | "completed" | "unknown";
};

export type UserInfoResult = {
  authState: PublicAuthState;
};

export type LogoutResult = {
  // The session that remains, since logging out while impersonating restores
  // the administrator's own.
  authState: PublicAuthState;
  path: string;
};

export const authPipeline = (
  options: {
    // Sign-in email changes for signed-in users; absent, the actions are not
    // registered.
    emailChange?: EmailChangeOptions;
    // Email-login and recovery-link behavior and copy.
    emailLogin?: EmailLoginOptions;
    forgotPassword?: ForgotPasswordProps;
    // Where a completed sign-in lands when the request carried no safe
    // returnTo; its result is checked like a returnTo and falls back to "/".
    loginDestination?: LoginDestination;
  } = {},
) => {
  const forgotPassword = {
    Email: ForgotPasswordEmail,
    attachments: forgotPasswordAttachments,
    ...options.forgotPassword,
  };
  const emailLogin = createEmailLogin({
    loginDestination: options.loginDestination,
    ...options.emailLogin,
  });
  const emailChange = options.emailChange
    ? createEmailChange(options.emailChange)
    : undefined;
  return {
    POST: (request: NextRequest) =>
      multiPipeline(
        { request },
        {
          logout: logoutPipeline(),
          "user-info": (actionOptions) =>
            pipeline(
              actionOptions,
              pipelineStage({}, async ({ response }) => {
                response.headers.set("Cache-Control", "no-store");
                return response.success<UserInfoResult>({
                  authState: await loadPublicAuthState(),
                });
              }),
            ),

          login: loginPipeline({
            loginDestination: options.loginDestination,
          }),
          "forgot-password": forgotPasswordPipeline(forgotPassword),
          "reset-password": resetPasswordPipeline(),

          "email-login": (actionOptions) =>
            pipeline(actionOptions, emailLogin.request),
          "verify-email-login-code": (actionOptions) =>
            pipeline(actionOptions, emailLogin.verifyCode),
          "verify-email-login-link": (actionOptions) =>
            pipeline(actionOptions, emailLogin.verifyLink),

          ...(emailChange
            ? {
                "email-change": (actionOptions) =>
                  pipeline(actionOptions, emailChange.request),
                "verify-email-change-code": (actionOptions) =>
                  pipeline(actionOptions, emailChange.verifyCode),
                "verify-email-change-link": (actionOptions) =>
                  pipeline(actionOptions, emailChange.verifyLink),
                "cancel-email-change": (actionOptions) =>
                  pipeline(actionOptions, emailChange.cancel),
              }
            : {}),

          "send-onboarding": sendOnboardingEmailAction,
        },
      ),
  };
};
