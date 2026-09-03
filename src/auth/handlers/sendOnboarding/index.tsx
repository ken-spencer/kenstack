import { and, eq, isNull } from "drizzle-orm";
import { render } from "react-email";
import * as z from "zod";

import { db } from "@app/db";
import { loadEmailFrom } from "@app/email";
import { modules } from "@app/modules";
import { pipeline, type PipelineOptions, pipelineStage } from "@kenstack/api";
import mailer from "@kenstack/lib/mailer";
import { formatUserName } from "@kenstack/lib/user";
import { audit } from "@kenstack/logger";
import OnboardingEmail, { attachments } from "./Email";

export const sendOnboardingEmailAction = (options: PipelineOptions) =>
  pipeline(
    options,
    pipelineStage(
      { access: "admin", schema: z.object({ userId: z.number() }) },
      async ({ data: { userId }, request, response, user: admin }) => {
        const from = await loadEmailFrom();
        if (!from) {
          return response.error("Onboarding email sender is not configured.");
        }

        const users = modules.users.admin.table;

        const [user] = await db
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
            "This user does not have an email address for onboarding.",
          );
        }

        const url = new URL("/login", request.url);
        url.searchParams.set("email", email);
        url.searchParams.set("notice", "onboarding");
        const delivery = await mailer({
          attachments,
          from,
          html: await render(
            <OnboardingEmail
              invitedBy={admin.name.trim() || "An administrator"}
              name={formatUserName(user, { fallback: "there" })}
              url={url.toString()}
            />,
          ),
          subject: "Your account is ready",
          to: email,
        });

        if (delivery.status === "recipient-rejected") {
          return response.error(
            "This email address could not receive the onboarding email.",
          );
        }
        if (delivery.status !== "sent") {
          return response.error(
            "We could not send the onboarding email. Try again in a moment.",
          );
        }

        await audit({
          action: "onboarding-email-sent",
          data: { userId },
          userId: admin.id,
        });

        return response.success({
          message: `An onboarding email has been sent to ${email}`,
        });
      },
    ),
  );
