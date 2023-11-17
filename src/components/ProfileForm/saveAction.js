"use server";

import errorLog from "../../log/error";
import authenticate from "../../auth/authenticate";
import validate from "../../db/validate";

// const fields = ["first_name", "last_name", "email"];
const rules = {
  first_name: "required",
  last_name: "required",
  email: {
    required: true,
    email: true,
    unique:
      "A subscriber with this email already exists. If this is you please login as that user.",
  },
};

export default async function loadProfile(initial, formData) {
  const user = await authenticate();


  formData.forEach((value, key) => {
    if (rules[key]) {
      user[key] = value;
    }
  });

  const errors = await validate(user, rules);

  if (errors) {
    return {
      error:
        "Oops! It looks like there are some issues with your form. See below for details.",
      fieldErrors: errors,
    };
  }

  try {
    await user.saveLog(user);
  } catch(e) {
    errorLog(e, "Problem saving profile");
    return {
      error: "There was an unexpected problem saving your profile. Please try again later.",
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
