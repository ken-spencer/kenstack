"use server";

import { cookies } from "next/headers";

import auditLog from "log/audit";
import { redirect } from "next/navigation";

export default async function logoutAction() {
  cookies().delete("auth");

  // TODO delete session
  auditLog("logout");
  redirect("/");
}
