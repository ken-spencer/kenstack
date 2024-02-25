import { NextResponse } from "next/server";
import notFound from "@thaumazo/cms/notFound";
import login from "@thaumazo/cms/auth/login";
import errorLog from "@thaumazo/cms/log/error";

// import { redirect } from "next/navigation";
// import { cookies } from "next/headers";

import ForgottenPassword from "@thaumazo/cms/models/ForgottenPassword";

export default async function forgottenPasswordRoute(request, slug) {
  const User = await thaumazoModels.get("User");
  const { origin } = request.nextUrl;

  const errorResponse = (message) => {
    const res = NextResponse.redirect(
      origin + thaumazoAdmin.pathName("/forgotten-password?"),
    );
    res.cookies.set("forgottenPassword", message);
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
      "Your link has expired. Please request an updated email and try again.",
    );
  }

  const res = NextResponse.redirect(
    origin + thaumazoAdmin.pathName("/reset-password?"),
  );
  try {
    await login(fp.user, res);
  } catch (e) {
    errorLog(e, "Problem logging in");
    return errorResponse(
      "There was a problem logging in. Please try again later",
    );
  }
  return res;
}
