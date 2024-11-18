"user server";

import errorLog from "@kenstack/log/error";
import auditLog from "@kenstack/log/audit";

import fields from "./fields";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function saveAction(formData, { session }) {
  const User = session.userModel;
  const duplicateUser = await User.findOne();

  if (duplicateUser) {
    return {
      error:
        "An account already exists. This tool can only be used to setup the first account",
    };
  }

  const user = new User({ roles: ["ADMIN"] });
  let errors = await user.bindFormData(fields, formData);
  if (errors) {
    return errors;
  }

  try {
    await user.save();
  } catch (e) {
    errorLog(e, "Problem saving user");
    return {
      error: "There was an unexpected problem creating the admin user.",
    };
  }

  auditLog("bootstrapAdmin", null, {}, user);

  try {
    await session.login(user);
  } catch (e) {
    errorLog(e, "Problem logging into  user");
    return { error: "There was an unexpected problem logging in" };
  }

  redirect(headers.get("referer") || "/");

  return {
    success:
      "Admin account has successfully been added. To secure your site remove this component. ",
  };
}
