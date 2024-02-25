"use server";

// import loadUser from "./loadUser";
import authenticate from "./authenticate";
import auditLog from "../log/audit";
import errorLog from "../log/error";
// import { redirect } from "next/navigation";

export default async function resetPasswordAction(init, data) {
  const user = await authenticate(); //loadUser();

  const password = data.get("password");
  const confirmPassword = data.get("confirmPassword");

  if (password !== confirmPassword) {
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
