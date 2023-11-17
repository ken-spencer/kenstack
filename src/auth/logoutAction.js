"use server";

import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";

import auditLog from "../log/audit";
import { redirect } from "next/navigation";

export default async function logoutAction() {
  // run this first before the relevant cookies are deleted
  auditLog("logout");

  cookies().delete("auth");
  cookies().delete("authPublic");

  // TODO delete session
  // use nanoid to ensure the page is updated if already on the  home page.
  const referer = headers().get("referer");

  let url;
  if (referer) {
    url = new URL(referer);
  }

  if (referer && url.pathname == "/") {
    redirect("/?homeRefresh=" + nanoid());
  }

  redirect("/");
}
