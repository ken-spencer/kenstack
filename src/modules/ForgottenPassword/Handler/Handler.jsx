import "server-only";

import { redirect, notFound } from "next/navigation";
import Session from "@admin/server/Session";

//import errorLog from "@admin/log/error";
import { cookies } from "next/headers";

import ForgottenPassword from "@admin/modules/ForgottenPassword/models/ForgottenPassword";

export default async function ForgottenPasswordHandler({
  session,
  token = "",
}) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  if (!token || !token.match(/^[A-Za-z0-9_-]{21}$/)) {
    notFound();
  }

  const User = session.userModel;

  const fp = await ForgottenPassword.findOne({ token }).populate({
    path: "user",
    model: User,
  });

  if (!fp) {
    notFound();
  }

  const now = new Date();
  if (fp.expiry < now) {
    const message =
      "Your link has expired. Please request an updated email and try again.";
    cookies().set("forgotten-password", message);
    redirect(session.forgottenPasswordPath);
  }

  /*
  const res = NextResponse.redirect(
    origin + thaumazoAdmin.pathName("/reset-password?"),
  );
  */
  /*
  try {
    await login(fp.user, res);
  } catch (e) {
    errorLog(e, "Problem logging in");
    return errorResponse(
      "There was a problem logging in. Please try again later",
    );
  }

  */
}

/*
export  async function forgottenPasswordRoute(request, slug) {
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

  return res;
}
*/
