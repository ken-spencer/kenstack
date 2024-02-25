"use server";

import loadUser from "./loadUser";
// import revalidate from "./revalidateAction";

export default async function accessCheck(roles = []) {
  const user = await loadUser();

  if (!user) {
    return false;
  }

  // await revalidate();

  if (roles.length === 0) {
    return user;
  }

  for (const role of roles) {
    if (user.roles.includes(role)) {
      return user;
    }
  }

  return false;
}
