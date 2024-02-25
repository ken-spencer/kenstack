"use server";

import errorLog from "../../../log/error";
import auditLog from "../../../log/audit";

import login from "../../../auth/login";
import fields from "./fields";
// import checkServerValidity from "@thaumazo/forms/validity/checkServerValidity";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function saveAction(init, formData) {
  /*
  let fieldErrors = checkServerValidity(fields, formData);
  if (fieldErrors) {
    return {
      error: "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    }
  }
  */

  const duplicateUser = await User.findOne();

  if (duplicateUser) {
    return {
      error:
        "An account already exists. This tool can only be used to setup the first account",
    };
  }

  const User = await thaumazoModels.get("User");
  const user = new User({ roles: ["ADMIN"] });
  let errors = await user.bindFormData(fields, formData);
  if (errors) {
    return errors;
  }

  /*
  try {
    fieldErrors = await user.checkValidity();
  } catch (e) {
    errorLog(e, "Problem validating user");
    return {error: "There was an unexpected problem saving your information"};
  }

  if (fieldErrors) {
    return {
      error: "We couldn't process your request. See the errors marked in red below.",
      fieldErrors,
    }
  }
  */

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
    await login(user);
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
