"use server";

// import loadUser from "./loadUser";
import authenticate from "./authenticate";
import auditLog from "../log/audit";
import errorLog from "../log/error";
// import { redirect } from "next/navigation";

export default async function resetPasswordAction(init, data) {
  let user;
  try {
    user = await authenticate(); //loadUser();
  } catch (e) {
    errorLog(e, "Problem loading the user");
    return {
      error: "There was a problem loading your user. Please try again later",
    };
  }

  /*
  if (!user) {
    redirect("/login");
  }
  */

  const password = data.get("password");
  const confirm_password = data.get("confirm_password");

  if (password !== confirm_password) {
    return { error: "The passwords you entered don't match." };
  }

  if (
    !password ||
    !password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\S]{8,}$/)
  ) {
    return {
      error:
        "Password must be at least 8 characters; include both big and small letters and a number.",
    };
  }

  user.password = password;
  try {
    await user.saveLog(user);
  } catch (e) {
    errorLog(e, "Problem saving password update");
    return {
      error: "There was a problem saving your password. Please try again later",
    };
  }

  auditLog("resetPassword", `Password was reset`, { user });

  return { success: "Your password has successfully been saved." };
}
