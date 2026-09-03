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

          login: loginPipeline(),
          "forgot-password": forgotPasswordPipeline(forgotPassword),
          "reset-password": resetPasswordPipeline(),

          "email-login": (actionOptions) =>
            pipeline(actionOptions, emailLogin.request),
          "verify-email-login-code": (actionOptions) =>
            pipeline(actionOptions, emailLogin.verifyCode),
          "verify-email-login-link": (actionOptions) =>
            pipeline(actionOptions, emailLogin.verifyLink),

          "send-onboarding": sendOnboardingEmailAction,
        },
      ),
  };
};
