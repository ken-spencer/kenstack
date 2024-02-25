"use server";

import errorLog from "../log/error";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { URLSearchParams } from "url";

import accessCheck from "./accessCheck";

export default async function authenticate(roles = []) {
  let user;
  try {
    user = await accessCheck(roles);
  } catch (e) {
    errorLog(e);
    redirectError(
      thaumazoAdmin.pathName("/login"),
      "loginError",
      "There was an unexpected problem authenticating your user. Please try again later",
    );
  }

  if (!user) {
    redirectError(
      thaumazoAdmin.pathName("/login"),
      "loginError",
      "You are logged out. Please log in and try again",
    );
  }

  return user;
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
