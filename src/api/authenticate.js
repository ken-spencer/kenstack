import Session from "@kenstack/server/Session";
import { NextResponse } from "next/server";

const authenticate =
  ({ roles = ["ADMIN"] } = {}) =>
  async ({ session, ...context }) => {
    if (!(session instanceof Session)) {
      throw Error("a valid session must be specified");
    }

    const user = await session.getAuthenticatedUser();
    const hasRole = await session.hasRole(...roles);
    if (hasRole !== true) {
      return NextResponse.json({ redirect: session.loginPath });
    }

    await session.revalidate(context);

    return { ...context, user };
  };

export default authenticate;
