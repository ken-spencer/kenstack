import "server-only";
import Session from "@kenstack/server/Session";
import { NextResponse } from "next/server";
import notFound from "@kenstack/notFound";

import ForgottenPassword from "../models/ForgottenPassword";
import errorLog from "@kenstack/log/error";

export default function API(session) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  const GET = async (request, { params }) => {
    const { token } = await params;
    const origin = request.nextUrl.protocol + request.headers.get("host");

    if (!token || !token.match(/^[A-Za-z0-9_-]{21}$/)) {
      return await notFound(request);
    }

    const errorResponse = (message) => {
      const redirect = NextResponse.redirect(
        origin + session.forgottenPasswordPath,
      );
      redirect.cookies.set("forgottenPassword", message);
      return redirect;
    };

    const User = session.userModel;

    const fp = await ForgottenPassword.findOne({ token }).populate({
      path: "user",
      model: User,
    });

    if (!fp) {
      return await notFound(request);
    }

    const now = new Date();
    if (fp.expiry < now) {
      return errorResponse(
        "Your link has expired. Please request an updated email and try again.",
      );
    }

    const response = NextResponse.redirect(origin + session.resetPasswordPath);

    try {
      await session.login(fp.user, response);
    } catch (e) {
      errorLog(e, "Problem logging in");
      return errorResponse(
        "There was an unexpected problem logging in. Please try again later",
      );
    }

    return response;
  };

  return { GET };
}
