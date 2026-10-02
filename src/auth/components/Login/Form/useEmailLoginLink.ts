"use client";

import fetcher, {
  type FetchError,
  type FetchSuccess,
} from "@kenstack/api/fetcher";
import type { EmailLoginVerificationResult } from "@kenstack/auth/api";
import {
  emailLoginLinkFailureCodeSchema,
  type EmailLoginLinkFailureCode,
} from "@kenstack/auth/email/login/schemas";
import useParamAction from "@kenstack/hooks/useParamAction";

import { askWaitingTabs } from "./signInChannel";

type EmailLoginLinkFailure = {
  code?: EmailLoginLinkFailureCode;
  message: string;
};

const linkRequestFailureMessage =
  "We couldn’t finish signing you in. Try the link again.";

function toLinkFailure(result: FetchError): EmailLoginLinkFailure {
  const code = emailLoginLinkFailureCodeSchema.safeParse(result.code);

  return {
    code: code.success ? code.data : undefined,
    message: result.message ?? "We couldn’t finish signing you in.",
  };
}

// Each token is verified once, and null verifies nothing. While it verifies, it asks the site's other
// tabs whether one waits on that sign-in. The outcome reaches the caller through one callback, for the
// latest token only: answered, when the waiting tab carries on; success; or failure.
export default function useEmailLoginLink(
  token: string | null,
  {
    onAnswered,
    onFailure,
    onSuccess,
    returnTo,
  }: {
    onAnswered: () => void;
    onFailure: (failure: EmailLoginLinkFailure) => void;
    onSuccess: (result: FetchSuccess<EmailLoginVerificationResult>) => void;
    returnTo?: () => string;
  },
) {
  useParamAction(
    token,
    (activeToken) => {
      const path = returnTo?.();
      return askWaitingTabs(
        fetcher<EmailLoginVerificationResult>("/api/auth", {
          action: "verify-email-login-link",
          ...(path ? { returnTo: path } : {}),
          token: activeToken,
        }),
      );
    },
    (_activeToken, verified) => {
      if (!verified) {
        onFailure({ message: linkRequestFailureMessage });
      } else if (verified.result.status !== "success") {
        onFailure(toLinkFailure(verified.result));
      } else if (
        "email" in verified.result.authState &&
        verified.emails.has(verified.result.authState.email)
      ) {
        onAnswered();
      } else {
        onSuccess(verified.result);
      }
    },
  );
}
