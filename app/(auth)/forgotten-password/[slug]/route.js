import { NextResponse } from "next/server";
import notFound from "notFound";
import login from "auth/login";
import errorLog from "log/error";

import ForgottenPassword from "models/ForgottenPassword";
import User from "models/User";

export async function GET(request, { params }) {
  const { slug } = params;
  const { origin } = request.nextUrl;

  const errorResponse = (message) => {
    const res = NextResponse.redirect(origin + "/forgotten-password?");
    res.cookies.set("forgottenPasswordApiError", message);
    return res;
  };

  if (!slug || !slug.match(/^[A-Za-z0-9_-]{21}$/)) {
    return await notFound(origin);
  }

  const fp = await ForgottenPassword.findOne({ token: slug }).populate({
    path: "user",
    model: User,
  });

  if (!fp) {
    return await notFound(origin);
  }
  const now = new Date();
  if (fp.expiry < now) {
    return errorResponse(
      "The requested link as expired. Please request an updated email and try again.",
    );
  }

  const res = NextResponse.redirect(origin + "/reset-password?");
  try {
    await login(fp.user, request, res);
  } catch (e) {
    errorLog(e, request, "Problem logging in");
    return errorResponse(
      "There was a problem logging in. Please try again later",
    );
  }
  return res;
}
