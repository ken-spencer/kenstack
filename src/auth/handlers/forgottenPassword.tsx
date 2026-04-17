import { deps } from "@app/deps";
import { and, eq, isNull, gte, sql } from "drizzle-orm";

import { geolocation, ipAddress } from "@vercel/functions";
import { nanoid } from "nanoid";
import crypto from "crypto";

import mailer, { type Attachment } from "@kenstack/lib/mailer";
import { render } from "@react-email/render";

import {
  pipeline,
  recaptcha,
  type PipelineOptions,
  type PipelineAction,
} from "@kenstack/lib/api";
import schema from "@kenstack/auth/schemas/forgotPassword";
import { type ForgotPasswordEmailProps } from "@kenstack/auth/email/ForgotPassword";

import DefaultEmail, {
  attachments as defaultAttachments,
} from "@kenstack/auth/email/ForgotPassword";

type ForgotPasswordProps = {
  Email?: React.FC<ForgotPasswordEmailProps>;
  attachments?: Attachment[];
  from: string;
};

export const forgottenPasswordPipeline =
  (props: ForgotPasswordProps) => (options: PipelineOptions<typeof schema>) =>
    pipeline({ ...options, schema }, [
      recaptcha(),
      forgottenPasswordAction(props),
    ]);

export const forgottenPasswordAction =
  ({
    Email = DefaultEmail,
    attachments = defaultAttachments,
    from,
  }: ForgotPasswordProps): PipelineAction<typeof schema> =>
  async ({ request, response, data }) => {
    if (!data) {
      throw Error("data is required");
    }
    const { email } = data;

    const MIN_RESPONSE_MS = 6000;
    const startedAt = Date.now();

    const sleepRemaining = async () => {
      const elapsed = Date.now() - startedAt;
      const remaining = MIN_RESPONSE_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    };

    const geo = geolocation(request);
    const ip = ipAddress(request) || "unknown";

    const { passwordResetRequests, users } = deps.tables;

    const [{ emailCount }] = await deps.db
      .select({
        emailCount: sql<number>`count(*)::int`,
      })
      .from(passwordResetRequests)
      .where(
        sql`${passwordResetRequests.requestedAt} > now() - interval '15 minutes'
        and ${passwordResetRequests.email} = ${email}`,
      );

    const ipCount =
      ip === "unknown"
        ? 0
        : (
            await deps.db
              .select({
                ipCount: sql<number>`count(*)::int`,
              })
              .from(passwordResetRequests)
              .where(
                sql`${passwordResetRequests.requestedAt} > now() - interval '15 minutes'
              and ${passwordResetRequests.ip} = ${ip}`,
              )
          )[0].ipCount;

    // let's avoid this feature being used to spam
    if (emailCount >= 3 || ipCount > 10) {
      await deps.logger.audit({
        action: "password-reset-flood",
        isSystem: true,
        data: { email },
      });

      await sleepRemaining();
      return response.error(
        ipCount > 10
          ? "We have received too many requests from your network to reset this password. Please try again later."
          : "We have received too many requests to reset this password. Please try again later.",
      );
    }

    const [user] = await deps.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));

    if (!user) {
      await deps.logger.audit({
        action: "password-reset-miss",
        isSystem: true,
        data: { email },
      });

      await deps.db.insert(deps.tables.passwordResetRequests).values({
        tokenHash: null,
        email,
        userAgent: request.headers.get("user-agent") || null,
        ip,
        geo,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });
      /** don't want to give away if account exists */
      await sleepRemaining();
      return response.success({
        message: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
      });
    } else {
      await deps.logger.audit({
        action: "password-reset-request",
        isSystem: true,
        data: { email },
      });
    }

    const tokenPlain = nanoid(32);
    const tokenHash = crypto
      .createHash("sha256")
      .update(tokenPlain)
      .digest("hex");

    /** Invalidate other password requests */
    await deps.db
      .update(passwordResetRequests)
      .set({
        expiresAt: new Date(),
        invalidatedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetRequests.email, email),
          isNull(passwordResetRequests.invalidatedAt),
          gte(passwordResetRequests.expiresAt, new Date()),
        ),
      );

    await deps.db.insert(passwordResetRequests).values({
      tokenHash,
      email,
      userAgent: request.headers.get("user-agent") || null,
      ip,
      geo,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    const url = new URL("/reset-password", request.url);
    url.searchParams.set("token", tokenPlain);

    const emailHtml = await render(
      <Email
        name={
          [user.firstName, user.lastName]
            .filter((part) => Boolean(part))
            .join(" ")
            .trim() || "there"
        }
        url={url.toString()}
        ip={ip}
        geo={geo}
        admin={false}
      />,
    );

    await mailer({
      to: email,
      from: from,
      subject: "Forgotten password request",
      html: emailHtml,
      attachments,
    });

    await sleepRemaining();
    return response.success({
      message: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
    });
  };
