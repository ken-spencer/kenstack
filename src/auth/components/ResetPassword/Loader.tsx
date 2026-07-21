import { redirect } from "next/navigation";
import Form from "./Form";
import { deps } from "@app/deps";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import Alert from "@kenstack/components/Alert";
import { hasRecentPasswordAuthentication } from "@kenstack/auth/passwordChange";

export default async function ForgottenPasswordFormLoader({
  token,
}: {
  token?: string;
}) {
  if (token) {
    if (!token.match(/^[A-Za-z0-9_-]{32}$/)) {
      return errorRedirect(
        "That password reset link isn't valid. Please request a new one below.",
      );
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { passwordResetRequests: prr } = deps.tables;

    const now = new Date();
    const [row] = await deps.db
      .select({
        id: prr.id,
        invalidatedAt: prr.invalidatedAt,
        expiresAt: prr.expiresAt,
      })
      .from(prr)
      .where(eq(prr.tokenHash, tokenHash));

    if (!row) {
      return errorRedirect(
        "That password reset link isn't valid. Please request a new one below.",
      );
    } else if (row.invalidatedAt) {
      return await errorRedirect(
        "That password reset link has already been used. Please request a new one below.",
      );
    } else if (row.expiresAt <= now) {
      return await errorRedirect(
        "That password reset link has expired. Please request a new one below.",
      );
    }
  } else {
    const session = await deps.auth.getCurrentSession();
    if (!session) {
      const params = new URLSearchParams({
        loginMessage:
          "That page needs you to be logged in. Please log in and try again.",
      });

      return redirect(`/login?${params.toString()}`);
    }

    if (session.impersonatedBy !== null) {
      return (
        <Alert>
          Password changes are unavailable while you are signed in as another
          user. Return to your own account first.
        </Alert>
      );
    }

    return (
      <Form
        requiresCurrentPassword={!hasRecentPasswordAuthentication(session)}
      />
    );
  }

  return <Form token={token} />;
}

const errorRedirect = (message: string) => {
  const params = new URLSearchParams({
    forgottenPasswordMessage: message,
  });

  return redirect(`/forgot-password?${params.toString()}`);
};
