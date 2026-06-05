import { deps } from "@app/deps";
import { and, eq, isNull, gte } from "drizzle-orm";

import { geolocation, ipAddress } from "@vercel/functions";
import { nanoid } from "nanoid";
import crypto from "crypto";
import * as z from "zod";

import mailer, { type Attachment } from "@kenstack/lib/mailer";
import { render } from "@react-email/render";

import {
  pipeline,
  recaptcha,
  type PipelineOptions,
  pipelineStage,
} from "@kenstack/api";
import { type ForgotPasswordEmailProps } from "@kenstack/auth/email/ForgotPassword";
import type { EmailFrom } from "@kenstack/deps";

import DefaultEmail, {
  attachments as defaultAttachments,
} from "@kenstack/auth/email/ForgotPassword";

export type ForgotPasswordProps = {
  Email?: React.FC<ForgotPasswordEmailProps>;
  attachments?: Attachment[];
  from?: EmailFrom;
};

export const sendPasswordResetPipeline =
  (props: ForgotPasswordProps) => (options: PipelineOptions) =>
    pipeline(options, [recaptcha(), sendPasswordResetAction(props)]);

export const sendPasswordResetAction = ({
  Email = DefaultEmail,
  attachments = defaultAttachments,
  from = deps.email.from,
}: ForgotPasswordProps) =>
  pipelineStage(
    { access: "admin", schema: z.object({ userId: z.number() }) },
    async ({ request, response, user: admin, data: { userId } }) => {
      if (!from) {
        return response.error("Password reset email sender is not configured.");
      }

      const geo = geolocation(request);
      const ip = ipAddress(request) || "unknown";

      const { passwordResetRequests, users } = deps.tables;

      const [user] = await deps.db
        .select({
          givenName: users.givenName,
          familyName: users.familyName,
          email: users.email,
        })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)));

      if (!user) {
        return response.error("Unable to find the requested user");
      }

      const email = user.email.trim();
      if (!email) {
        return response.error(
          "This user does not have an email address for password reset.",
        );
      }

      const tokenPlain = nanoid(32);
      const tokenHash = crypto
        .createHash("sha256")
        .update(tokenPlain)
        .digest("hex");

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await deps.db.transaction(async (tx) => {
        /** Invalidate other password requests */
        await tx
          .update(passwordResetRequests)
          .set({
            expiresAt: now,
            invalidatedAt: now,
          })
          .where(
            and(
              eq(passwordResetRequests.email, email),
              isNull(passwordResetRequests.invalidatedAt),
              gte(passwordResetRequests.expiresAt, now),
            ),
          );

        await tx.insert(passwordResetRequests).values({
          tokenHash,
          email,
          userAgent: request.headers.get("user-agent") || null,
          ip,
          geo,
          expiresAt,
        });
      });

      const url = new URL("/reset-password", request.url);
      url.searchParams.set("token", tokenPlain);

      const emailHtml = await render(
        <Email
          name={
            [user.givenName, user.familyName]
              .filter((part) => Boolean(part))
              .join(" ")
              .trim() || "there"
          }
          url={url.toString()}
          ip={ip}
          geo={geo}
          admin={true}
        />,
      );

      await deps.logger.audit({
        action: "password-reset-sent",
        data: { userId },
      });

      await mailer({
        to: email,
        from,
        subject: `${admin.givenName} ${admin.familyName} has requested a password reset`,
        html: emailHtml,
        attachments,
      });

      return response.success({
        message: `An email has been sent to ${email}`,
      });
    },
  );
