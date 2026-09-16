import "server-only";

import type { ReactElement } from "react";
import type { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { render } from "react-email";

import { db } from "@app/db";
import { attachments, loadEmailFrom } from "@app/email";
import { modules } from "@app/modules";
import { adminListCacheTag, adminLoadCacheTag } from "@kenstack/admin/cache";
import { pipelineStage, ReturnedError } from "@kenstack/api";
import type {
  EmailChangeCancelResult,
  EmailChangeRequestResult,
  EmailChangeVerificationResult,
} from "@kenstack/auth/api";
import {
  loadFreshAuthState,
  loadFreshPublicAuthState,
  loadPublicAuthState,
} from "@kenstack/auth/server/state";
import { userSessionsCacheTag } from "@kenstack/auth/server/user";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import { verifications } from "@kenstack/db/tables/verification";
import { normalizeEmail } from "@kenstack/fields/email";
import errorLog from "@kenstack/lib/errorLog";
import { reportError } from "@kenstack/lib/errorReporter";
import mailer from "@kenstack/lib/mailer";
import siteOrigin from "@kenstack/lib/siteOrigin";
import { audit } from "@kenstack/logger";

import {
  createVerificationEmail,
  type VerificationEmailCopy,
} from "@kenstack/auth/email/verification/Email";
import {
  selectBoundHistory,
  verificationEndedCode,
  verificationReplacedMessage,
} from "@kenstack/auth/email/verification/internal/policy";
import {
  consumeVerification,
  endVerification,
  loadVerificationsForUpdate,
} from "@kenstack/auth/email/verification/internal/repository";
import { sendCode } from "@kenstack/auth/email/verification/sendCode";
import { verifyCode } from "@kenstack/auth/email/verification/verifyCode";
import { verifyLink } from "@kenstack/auth/email/verification/verifyLink";
import ExistingAccountEmail from "./ExistingAccountEmail";
import NoticeEmail from "./NoticeEmail";
import {
  cancelEmailChangeSchema,
  requestEmailChangeSchema,
  verifyEmailChangeCodeSchema,
  verifyEmailChangeLinkSchema,
} from "./schemas";

// Every row this owner creates or accepts carries this kind and the account
// that asked. A proof obtained any other way, such as through email login,
// cannot confirm a change: only a change request notified the old address.
const kind = "email-change";

const emailChangeLinkFailureMessages = {
  expired:
    "This confirmation link has expired. Request a new email to continue.",
  invalid:
    "This confirmation link is no longer valid. Request a new email to continue.",
  "wrong-browser":
    "This link was opened in a different browser. Open it in the browser where you requested the change, or request a new email there. The link is still valid.",
};

// Side notices never block the change. The mailer logs a failed delivery
// itself; the reporter is never used for one because it alerts by email.
async function sendNotice({
  html,
  request,
  subject,
  to,
  userId,
}: {
  html: ReactElement;
  request: NextRequest;
  subject: string;
  to: string;
  userId: number;
}) {
  try {
    const from = await loadEmailFrom();
    if (from) {
      await mailer({
        attachments,
        from,
        html: await render(html),
        subject,
        to,
      });
    } else {
      await errorLog({
        message: "Email change notice sender is not configured.",
        name: "email-change-notice-sender-not-configured",
      });
    }
  } catch (error) {
    await reportError(error, {
      context: { userId },
      request,
      source: "auth.emailChange.notice",
    });
  }
}

export type EmailChangeOptions = {
  email?: Partial<VerificationEmailCopy>;
  // The page hosting the EmailChange component, where the confirmation and
  // cancellation links land.
  linkPath?: `/${string}`;
};

export function createEmailChange(options: EmailChangeOptions = {}) {
  const config = {
    email: {
      actionLabel: "Confirm email",
      heading: "Confirm your new email",
      introduction:
        "Confirming this address makes it the email you sign in with. Use the button below or enter the six-digit code to continue.",
      subject: "Confirm your new email",
      ...options.email,
    },
    linkPath: options.linkPath ?? ("/account/profile" as const),
  };

  return {
    request: pipelineStage(
      { access: "authenticated", schema: requestEmailChangeSchema },
      async ({ data, request, response, user }) => {
        if (data.email === normalizeEmail(user.email)) {
          return response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            fieldErrors: { email: "That is already your email address" },
          });
        }

        // An address with its own account gets a decoy challenge: the code
        // screen looks the same, no code can prove it, and the address's
        // owner is told why no code arrived. The unique index still guards
        // the apply. A resend continues only a challenge of this kind for
        // this account; the sender refuses any other.
        const isTaken = Boolean(
          await db.query.users.findFirst({
            columns: { id: true },
            where: (users, { and, isNull }) =>
              and(
                sql`lower(${users.email}) = ${normalizeEmail(data.email)}`,
                isNull(users.deletedAt),
              ),
          }),
        );
        const { challengeKey, email } = await sendCode(
          {
            challengeKey: data.challengeKey,
            email: data.email,
            isDecoy: isTaken,
            kind,
            linkPath: config.linkPath,
            request,
            userId: user.id,
          },
          createVerificationEmail(config.email),
        );
        if (isTaken) {
          await sendNotice({
            html: (
              <ExistingAccountEmail
                loginUrl={new URL(
                  "/login",
                  await siteOrigin(request),
                ).toString()}
              />
            ),
            request,
            subject: "This email already has an account",
            to: email,
            userId: user.id,
          });
        }

        // The notice warns the address being replaced once per request, not
        // on resends, and never blocks the change.
        if (!data.challengeKey) {
          const cancelUrl = new URL(config.linkPath, await siteOrigin(request));
          cancelUrl.searchParams.set("cancelEmailChange", challengeKey);
          await sendNotice({
            html: (
              <NoticeEmail cancelUrl={cancelUrl.toString()} newEmail={email} />
            ),
            request,
            subject: "Your sign-in email is being changed",
            to: user.email,
            userId: user.id,
          });
        }

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailChangeRequestResult>({
          authState: await loadPublicAuthState(),
          challengeKey,
          email,
        });
      },
    ),
    verifyCode: pipelineStage(
      { access: "authenticated", schema: verifyEmailChangeCodeSchema },
      async ({ data, response, user }) => {
        await applyEmailChange(
          await verifyCode({ ...data, kind, userId: user.id }),
        );

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailChangeVerificationResult>({
          authState: await loadFreshPublicAuthState(),
        });
      },
    ),
    verifyLink: pipelineStage(
      { access: "authenticated", schema: verifyEmailChangeLinkSchema },
      async ({ data, response, user }) => {
        const verification = await verifyLink(data.token, {
          kind,
          userId: user.id,
        });
        if (verification.state !== "proven") {
          throw new ReturnedError(
            emailChangeLinkFailureMessages[verification.state],
            { code: verification.state, status: 409 },
          );
        }

        await applyEmailChange(verification);

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailChangeVerificationResult>({
          authState: await loadFreshPublicAuthState(),
        });
      },
    ),
    // Reached from the notice sent to the replaced address, so no session is
    // required.
    cancel: pipelineStage(
      { schema: cancelEmailChangeSchema },
      async ({ data, response }) => {
        const outcome = await db.transaction(async (tx) => {
          const [noticed] = await tx
            .select({
              email: verifications.email,
              id: verifications.id,
              kind: verifications.kind,
              userId: verifications.userId,
              verificationKeyHash: verifications.verificationKeyHash,
            })
            .from(verifications)
            .where(eq(verifications.challengeKey, data.challengeKey))
            .limit(1);
          if (!noticed || noticed.kind !== kind) {
            return "unknown" as const;
          }

          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${noticed.verificationKeyHash}))`,
          );
          const history = selectBoundHistory(
            await loadVerificationsForUpdate(tx, noticed.verificationKeyHash),
            { kind, userId: noticed.userId },
          );
          const now = new Date();
          const active = [];
          // Newest first. The noticed request and its resends share its
          // address; the first ended row closes that request. Applying the
          // change consumes a proven row, so an ended proven row reads as
          // completed. A later request for another address also ends a
          // proven row, which then reads as completed too: the safer answer.
          for (
            let index = history.findIndex(({ id }) => id === noticed.id);
            index >= 0 && history[index].email === noticed.email;
            index -= 1
          ) {
            const row = history[index];
            if (row.endedAt) {
              return row.provenAt
                ? ("completed" as const)
                : ("unknown" as const);
            }
            if (row.expiresAt > now) {
              active.push(row);
            }
          }
          if (!active.length) {
            return "unknown" as const;
          }

          for (const row of active) {
            await endVerification(tx, row.id, now);
          }
          return "cancelled" as const;
        });

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailChangeCancelResult>({ outcome });
      },
    ),
  };
}

async function applyEmailChange({
  email,
  verificationId,
}: {
  email: string;
  verificationId: number;
}) {
  // A write must not trust the cached session snapshot.
  const authState = await loadFreshAuthState();
  if (authState.state !== "authenticated") {
    throw new ReturnedError("You must be signed in to change your email.", {
      status: 401,
    });
  }

  const users = modules.users.admin.table;
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      // Consumed first, as this account's own change request: another tab or
      // the notice's cancel link may already have ended it.
      if (
        !(await consumeVerification(verificationId, email, tx, {
          kind,
          userId: authState.userId,
        }))
      ) {
        throw new ReturnedError(verificationReplacedMessage, {
          code: verificationEndedCode,
          status: 409,
        });
      }

      await tx
        .update(users)
        .set({ email: normalizeEmail(email), updatedAt: now })
        .where(eq(users.id, authState.userId));

      await audit({
        action: "email-changed",
        data: { from: authState.email, to: normalizeEmail(email) },
        db: tx,
        rowId: authState.userId,
        table: "users",
        userId: authState.userId,
      });
    });
  } catch (error) {
    if (errorTranslator(error)?.fieldErrors?.email) {
      // Only a race can reach this: the address had no account when the code
      // was sent. The proof is ended so it cannot linger in the browser's
      // chain, and the reply reveals no more than the request stage does.
      await db.transaction((tx) => endVerification(tx, verificationId, now));
      throw new ReturnedError(
        "That change could not be completed. Enter the address again to start over.",
        { status: 409 },
      );
    }
    throw error;
  }

  revalidateTag(userSessionsCacheTag(authState.userId), { expire: 0 });
  revalidateTag(adminLoadCacheTag("users", authState.userId), { expire: 0 });
  revalidateTag(adminListCacheTag("users"), { expire: 0 });
}
