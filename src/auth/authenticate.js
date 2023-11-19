import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import loadUser from "./loadUser";
import revalidate from "./revalidate";



export default async function authenticate(roles = []) {
  const user = await loadUser();

  if (!user) {
    cookies().set(
      "loginError",
      "Your session has expired. Please login again.",
    );
    redirect("/login");
  }

  await revalidate(cookies())

  if (roles.length === 0) {
    return user;
  }

  // TODO compare specified roles with the user's roles.
  return false;
}
