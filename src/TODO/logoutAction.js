"use server";

import { revalidatePath } from "next/cache";

// import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";
import Session from "../models/Session";

// import { redirect } from "next/navigation";
import auditLog from "../log/audit";

export default async function logoutAction({ session }) {
  const claims = await session.getClaims();

  // run this first before the relevant cookies are deleted
  await auditLog("logout");

  cookies().delete("auth");
  cookies().delete("authPublic");

  // use nanoid to ensure the page is updated if already on the  home page.
  const referer = headers().get("referer");

  /*
  let url;
  if (referer) {
    url = new URL(referer);
  }
  */

  if (claims) {
    await Session.deleteOne({ _id: claims.sid });
  }

  revalidatePath(referer);

  /*
  if (referer && url.pathname == "/") {
    redirect("/?homeRefresh=" + nanoid());
  }

  redirect(thaumazoAdmin.pathName("/login"));
  */
}
