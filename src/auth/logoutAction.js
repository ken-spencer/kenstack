"use server";

import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";
import verifyJWT from "./verifyJWT";
import Session from "../models/Session";

import auditLog from "../log/audit";
import { redirect } from "next/navigation";

export default async function logoutAction() {
  const claims = await verifyJWT();

  // run this first before the relevant cookies are deleted
  await auditLog("logout")

  cookies().delete("auth");
  cookies().delete("authPublic");

  // use nanoid to ensure the page is updated if already on the  home page.
  const referer = headers().get("referer");

  let url;
  if (referer) {
    url = new URL(referer);
  }

  if (claims) {
    await Session.deleteOne({ _id: claims.sid })
  }

  if (referer && url.pathname == "/") {
    redirect("/?homeRefresh=" + nanoid());
  }

  redirect("/");
}
