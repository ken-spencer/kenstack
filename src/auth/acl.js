"use server";

import errorLog from "../log/error";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { URLSearchParams } from "url";

import loadUser from "./loadUser";
import revalidate from "./revalidateAction";

// This function is an access wrapper for server actions. Weill not work in server component
export default async function acl(...args) {
  if (args.length < 2) {
    throw Error(
      "Expected arguments are 1 or more roles followed by a callback",
    );
  }

  const cb = args.pop();
  const roles = args;

  let user;
  try {
    user = await loadUser();
  } catch (e) {
    errorLog(e);
    return { error: "There was an unexpected problem. Please try again later" };
  }

  if (!user) {
    redirectError(
      thaumazoAdmin.pathName("/login"),
      "loginError",
      "You are logged out. Please log in and try again",
    );
  }

  if (!user.hasRole(...roles)) {
    return { error: "You do not have permission to perform this operation" };
  }
  await revalidate();
  return await cb(user);

  /*
  for (const role of roles) {
    if (user.roles.includes(role)) {
    }
  }
  */
}

function redirectError(path, name, message) {
  try {
    // works in a server action only
    cookies().set(name, message);
    redirect(path);
  } catch (e) {
    // fall back to query string if in a server component
    const params = new URLSearchParams({ [name]: message });
    redirect(path + "?" + params);
  }
}
