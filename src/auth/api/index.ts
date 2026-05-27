import { multiPipeline } from "@kenstack/api";
import { NextRequest } from "next/server";
import { loginPipeline } from "@kenstack/auth/handlers/login";
import { logoutPipeline } from "@kenstack/auth/handlers/logout";
import { resetPasswordPipeline } from "@kenstack/auth/handlers/resetPassword";
import { sendPasswordResetPipeline } from "@kenstack/auth/handlers/sendPasswordReset";
import { deps } from "@app/deps";
import {
  forgotPasswordPipeline,
  type ForgotPasswordProps,
} from "@kenstack/auth/handlers/forgotPassword";

// import Email, { attachments } from '@kenstack/auth/email/ForgotPassword';

import merge from "lodash-es/merge";
import FpEmail, {
  attachments as FpAttachments,
} from "@kenstack/auth/email/ForgotPassword";

type AuthPipelineOptions = { forgotPassword?: ForgotPasswordProps };
const defaults = {
  forgotPassword: {
    from: deps.email.from,
    Email: FpEmail,
    attachments: FpAttachments,
  },
} satisfies Required<AuthPipelineOptions>;

export const authPipeline = (props: AuthPipelineOptions = {}) => {
  const options = merge({}, defaults, props);
  const POST = (request: NextRequest) =>
    multiPipeline({ request }, [
      ["login", loginPipeline()],
      ["logout", logoutPipeline()],
      ["forgot-password", forgotPasswordPipeline(options.forgotPassword)],
      ["reset-password", resetPasswordPipeline()],
      [
        "send-password-reset",
        sendPasswordResetPipeline(options.forgotPassword),
      ],
    ]);

  return { POST };
};
