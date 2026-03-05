import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { geolocation, ipAddress } from "@vercel/functions";
import {
  recaptcha,
  pipeline,
  type PipelineOptions,
  type PipelineAction,
} from "@kenstack/lib/api";
import loginSchema from "@kenstack/auth/schemas/login";
import { deps } from "@server/deps";
import { sql } from "drizzle-orm";

import { PipelineResponse } from "@kenstack/lib/api/PipelineResponse";

export const loginPipeline = () => (options: PipelineOptions) =>
  pipeline({ ...options, schema: loginSchema }, [recaptcha(), login()]);

const login =
  (): PipelineAction<typeof loginSchema> =>
  async ({ data: { email, password }, request, response }) => {
    const ip = ipAddress(request) ?? "127.0.0.1";
    const {
      db,
      tables: { loginFailures },
    } = deps;

    const [{ emailCount, ipCount }] = await db
      .select({
        emailCount: sql<number>`(count(*) FILTER (WHERE ${loginFailures.email} = ${email}))::int`,
        ipCount: sql<number>`(count(*) FILTER (WHERE ${loginFailures.ip} = ${ip}))::int`,
      })
      .from(loginFailures)
      .where(
        sql`${loginFailures.attemptedAt} > now() - interval '15 minutes'
        and (${loginFailures.email} = ${email} or ${loginFailures.ip} = ${ipAddress})`
      );

    if (emailCount >= 3) {
      return response.error(
        "Your account has been temporarily locked due to multiple failed login attempts. Please wait 15 minutes before trying again. If you've forgotten your password, consider using the 'Forgot Password' option."
      );
    }
    if (ipCount >= 10) {
      return response.error(
        "Your account has been temporarily locked due to suspicious activity from your network. Please wait 15 minutes before trying again. If you've forgotten your password, consider using the 'Forgot Password' option."
      );
    }

    const user = await db.query.users.findFirst({
      columns: { id: true, passwordHash: true },
      where: (u, { and, eq, isNull }) =>
        and(eq(u.email, email), isNull(u.deletedAt)),
    });

    if (!user || !user.passwordHash) {
      // prevent introspection using timing.
      const failHash =
        "$2b$12$vU8SBwjV2ZMjNFqpESF7lug7JWrU3A3EfBFpT.lqUal5tlqvdIcV";
      await bcrypt.compare("fake-to-delay", failHash);

      return await failResponse(email, request, response);
    }

    const success = await bcrypt.compare(password, user.passwordHash);
    if (!success) {
      return await failResponse(email, request, response);
    }

    const returnTo = request.cookies.get("returnTo");
    const path = returnTo?.value ?? "/";

    await deps.auth.login(user.id);

    if (returnTo) {
      response.cookies.delete("returnTo");
    }

    return response.success({
      authenticated: true,
      path,
    });
  };

async function failResponse(
  email: string,
  request: NextRequest,
  response: PipelineResponse
) {
  const {
    db,
    tables: { loginFailures },
  } = deps;
  const ip = ipAddress(request) ?? "127.0.0.1";

  const geo = geolocation(request) || null;

  await db.insert(loginFailures).values({
    email,
    ip,
    userAgent: request.headers.get("user-agent"),
    geo,
  });

  return response.error(`
    Please try again. If you are unable to sign in, use the “Forgotten your password” link below. 
    Your access will temporarily be suspended after three failed login attempts.
  `);
}

export default login;
