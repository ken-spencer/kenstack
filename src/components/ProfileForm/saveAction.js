"use server";

import errorLog from "../../log/error";
import authenticate from "../../auth/authenticate";

import fields from "./fields";
// const fields = ["first_name", "last_name", "email"];

export default async function loadProfile(initial, formData) {
  const user = await authenticate();

  const errors = await user.bindFormData(fields, formData);
  if (errors) {
    return errors;
  }

  try {
    await user.saveLog(user);
  } catch (e) {
    errorLog(e, "Problem saving profile");
    return {
      error:
        "There was an unexpected problem saving your profile. Please try again later.",
    };
  }

  return {
    success: "Your profile has successfully been updated",
    values: {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
  };
}
