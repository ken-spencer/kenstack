import "server-only";

import type { ReactElement } from "react";
import type { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { render } from "react-email";

import { db } from "@app/db";
import { attachments } from "@app/email";
import { modules } from "@app/modules";
import { adminListCacheTag, adminLoadCacheTag } from "@kenstack/admin/cache";
import { pipelineStage, ReturnedError } from "@kenstack/api";
import type {
  EmailChangeCancelResult,
  EmailChangeRequestResult,
  EmailChangeVerificationResult,
} from "@kenstack/auth/api";
import {
  loadFreshPublicAuthState,
  loadPublicAuthState,
} from "@kenstack/auth/server/state";
import { userSessionsCacheTag } from "@kenstack/auth/server/user";
import { login } from "@kenstack/auth/server/auth";
import { requireRecentAuthentication } from "@kenstack/auth/reauthentication/server";
import { sessions } from "@kenstack/db/tables/sessions";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import { verifications } from "@kenstack/db/tables/verification";
import { normalizeEmail } from "@kenstack/fields/email";
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
  verificationExpiredMessage,
  verificationReplacedMessage,
} from "@kenstack/auth/email/verification/internal/policy";
import {
  consumeVerification,
  endVerification,
  loadVerificationsForUpdate,
} from "@kenstack/auth/email/verification/internal/repository";
import { sendCode } from "@kenstack/auth/email/verification/sendCode";
import { verifyCode } from "@kenstack/auth/email/verification/verifyCode";
import {
  checkLink,
  verifyLink,
} from "@kenstack/auth/email/verification/verifyLink";
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
    await mailer({
      attachments,
      html: await render(html),
      subject,
      to,
    });
  } catch (error) {
    await reportError(error, {
      context: { userId },
      request,
      source: "auth.emailChange.notice",
    });
  }
}

// The code step and a resend run only in the session that issued the code, whose authorization lasts
// as long as the code. A stale session there means the code has expired too, so the refusal is the
// ordinary expired request, which returns the visitor to the email form without a confirmation.
async function requireIssuingSession(request: Request, userId: number) {
  try {
    return await requireRecentAuthentication(request, userId);
  } catch (error) {
    if (
      error instanceof ReturnedError &&
      error.code === "reauthentication-required" &&
      error.status === 403
    ) {
      throw new ReturnedError(verificationExpiredMessage, {
        code: verificationEndedCode,
        status: 409,
      });
    }
    throw error;
  }
}

export type EmailChangeOptions = {
  email?: Partial<VerificationEmailCopy>;
  // A public page rendering the EmailChange component, where the confirmation and cancellation links
  // land.
  linkPath: `/${string}`;
};

export function createEmailChange(options: EmailChangeOptions) {
  const heading = options.email?.heading ?? "Confirm your new email";
  const config = {
    email: {
      actionLabel: "Confirm email",
      heading,
      introduction:
        "Confirming this address makes it the email you sign in with. Enter this six-digit code to continue.",
      subject: heading,
      ...options.email,
    },
  };

  return {
    request: pipelineStage(
      { access: "authenticated", schema: requestEmailChangeSchema },
      async ({ data, request, response, user }) => {
        const session = data.challengeKey
          ? await requireIssuingSession(request, data.userId)
          : await requireRecentAuthentication(request, data.userId);
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
            linkPath: options.linkPath,
            request,
            userId: session.userId,
            sessionId: session.id,
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
          const cancelUrl = new URL(options.linkPath, await siteOrigin(request));
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
      async ({ data, request, response }) => {
        const session = await requireIssuingSession(request, data.userId);
        await applyEmailChange(
          await verifyCode({
            challengeKey: data.challengeKey,
            code: data.code,
            kind,
            userId: session.userId,
          }),
          session,
        );

        response.headers.set("Cache-Control", "no-store");
        return response.success<EmailChangeVerificationResult>({
          authState: await loadFreshPublicAuthState(),
        });
      },
    ),
    verifyLink: pipelineStage(
      { access: "authenticated", schema: verifyEmailChangeLinkSchema },
      async ({ data, request, response }) => {
        let session;
        try {
          session = await requireRecentAuthentication(request, data.userId);
        } catch (error) {
          // The link may be opened in any session of the account, which the code's grant never
          // touched. A stale one checks the link without writing: a link it would reject gets its
          // ordinary refusal, and only one it would accept asks for confirmation.
          if (
            error instanceof ReturnedError &&
            error.code === "reauthentication-required" &&
            error.status === 403
          ) {
            const state = await checkLink(data.token, {
              kind,
              userId: data.userId,
            });
            if (state !== "acceptable") {
              throw new ReturnedError(emailChangeLinkFailureMessages[state], {
                code: state,
                status: 409,
              });
            }
          }
          throw error;
        }
        const verification = await verifyLink(data.token, {
          kind,
          userId: session.userId,
        });
        if (verification.state !== "proven") {
          throw new ReturnedError(
            emailChangeLinkFailureMessages[verification.state],
            { code: verification.state, status: 409 },
          );
        }

        await applyEmailChange(verification, session);

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

// The session is the one the guard checked before the proof was verified.
async function applyEmailChange(
  {
    email,
    verificationId,
  }: {
    email: string;
    verificationId: number;
  },
  session: Awaited<ReturnType<typeof requireRecentAuthentication>>,
) {
  const { userId } = session;
  const users = modules.users.admin.table;
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const [account] = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      // Consumed first, as this account's own change request: another tab or
      // the notice's cancel link may already have ended it.
      if (
        !(await consumeVerification(verificationId, email, tx, {
          kind,
          userId,
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
        .where(eq(users.id, userId));

      await tx.delete(sessions).where(eq(sessions.userId, userId));

      await audit({
        action: "email-changed",
        data: { from: account?.email, to: normalizeEmail(email) },
        db: tx,
        rowId: userId,
        table: "users",
        userId,
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

  revalidateTag(userSessionsCacheTag(userId), { expire: 0 });
  revalidateTag(adminLoadCacheTag("users", userId), { expire: 0 });
  revalidateTag(adminListCacheTag("users"), { expire: 0 });
  await login(userId, session.provider);
}
