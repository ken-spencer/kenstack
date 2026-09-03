import { and, isNull, sql } from "drizzle-orm";
import { geolocation } from "@vercel/functions";
import { render } from "react-email";

import { db } from "@app/db";
import { loadEmailFrom } from "@app/email";
import { modules } from "@app/modules";
import {
  checkQuota,
  claimQuota,
  pipeline,
  type PipelineOptions,
  pipelineStage,
  recaptcha,
  ReturnedError,
} from "@kenstack/api";
import getIp from "@kenstack/lib/ip";

import { sendVerificationLink } from "@kenstack/auth/email/verification/sendCode";
import DefaultEmail, {
  attachments as defaultAttachments,
  type ForgotPasswordEmailProps,
} from "@kenstack/auth/handlers/forgotPassword/Email";
import schema from "@kenstack/auth/schemas/forgotPassword";
import { audit } from "@kenstack/logger";
import type { Attachment, EmailAddress } from "@kenstack/lib/mailer";
import { formatUserName } from "@kenstack/lib/user";

export type ForgotPasswordProps = {
  Email?: React.FC<ForgotPasswordEmailProps>;
  attachments?: Attachment[];
  from?: EmailAddress;
};

export const forgotPasswordPipeline =
  (props: ForgotPasswordProps) => (options: PipelineOptions) =>
    pipeline(
      options,
      pipelineStage({ schema }, async ({ data, request, response }) => {
        const Email = props.Email ?? DefaultEmail;
        const from = props.from ?? (await loadEmailFrom());
        if (!from) {
          return response.error(
            "Password reset email sender is not configured.",
          );
        }

        const { email } = data;

        const startedAt = Date.now();

        const sleepRemaining = async () => {
          const remaining = 6_000 - (Date.now() - startedAt);
          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }
        };

        try {
          const exceeded = await checkQuota("forgottenPassword", {
            email,
            ip: await getIp(request),
          });
          if (exceeded) {
            await sleepRemaining();
            return response.error({
              message: exceeded.message,
              status: 429,
            });
          }
        } catch (error) {
          await sleepRemaining();
          throw error;
        }

        const recaptchaRejection = await recaptcha({
          action: "forgottenPassword",
          request,
          response,
          token: data.recaptchaToken,
        });
        if (recaptchaRejection) {
          return recaptchaRejection;
        }

        const exceeded = await claimQuota("forgottenPassword", {
          email,
          ip: await getIp(request),
        });
        if (exceeded) {
          await sleepRemaining();
          return response.error({
            message: exceeded.message,
            status: 429,
          });
        }

        const geo = geolocation(request);
        const ip = (await getIp(request)) ?? "unknown";

        const users = modules.users.admin.table;

        const [user] = await db
          .select({
            givenName: users.givenName,
            familyName: users.familyName,
          })
          .from(users)
          .where(
            and(sql`lower(${users.email}) = ${email}`, isNull(users.deletedAt)),
          )
          .limit(1);

        if (user) {
          await audit({
            action: "password-reset-request",
            userId: null,
            data: { email },
          });
        } else {
          await audit({
            action: "password-reset-miss",
            userId: null,
            data: { email },
          });
        }

        try {
          await sendVerificationLink(
            {
              attachments: props.attachments ?? defaultAttachments,
              email,
              from,
              isDecoy: !user,
              linkPath: "/login?returnTo=%2Freset-password",
              request,
            },
            async ({ expiresInMinutes, url }) => ({
              html: await render(
                <Email
                  expiresInMinutes={expiresInMinutes}
                  geo={geo}
                  ip={ip}
                  name={user ? formatUserName(user) : "there"}
                  url={url}
                />,
              ),
              subject: "Forgotten password request",
            }),
          );
        } catch (error) {
          if (!(error instanceof ReturnedError)) {
            throw error;
          }
        }

        await sleepRemaining();
        return response.success({
          message: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
        });
      }),
    );
