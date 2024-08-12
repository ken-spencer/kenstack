"use server";

// import loadUser from "./loadUser";
// import auditLog from "../log/audit";
// import errorLog from "../log/error";
// import { redirect } from "next/navigation";

export default async function resetPasswordAction(data, { session }) {
  const user = await session.getAuthenticatedUser();

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
  await user.save();

  // auditLog("resetPassword", `Password was reset`, { user });

  return { success: "Your password has successfully been set." };
}
