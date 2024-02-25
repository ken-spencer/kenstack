"use server";

import React from "react";
import { headers } from "next/headers";

import mailer from "../../../../utils/mailer";
import authenticate from "../../../../auth/authenticate";
import auditLog from "../../../../log/audit";
import errorLog from "../../../../log/error";

import ForgottenPassword from "../../../../models/ForgottenPassword";

import DefaultEmail from "../Email";
import { render } from "@react-email/render";

export default async function emailAction(userId) {
  const admin = await authenticate(["ADMIN"]);

  const User = await thaumazoModels.get("User");
  let user;
  try {
    user = await User.findById(userId);
  } catch (e) {
    errorLog(e);
    return {
      error:
        "There was an unexpected problem loading the user. Please try again later",
    };
  }

  if (!user) {
    return {
      error: "There was an problem loading the user. Was this account deleted?",
    };
  }

  let expiry = new Date();
  expiry.setDate(expiry.getDate() + 2); // expire in 2 days

  const fp = new ForgottenPassword({
    user,
    expiry,
  });

  try {
    await fp.save();
  } catch (e) {
    errorLog(e, "Problem saving forgotten password request");
    return { error: "There was an unexpected problem. Please try again later" };
  }

  auditLog("password-email", null, {}, admin);

  const url =
    headers().get("origin") +
    thaumazoAdmin.pathName("/forgotten-password/" + fp.token);

  const message = `
Hello, this is ${admin.getFullName()}. I am  reaching out to assist with your account access. \
Whether you're in need of a password reset or we're setting up your new account, simply click\
 the button below to proceed.\
`;

  const postMessage = `
This link will remain active for 2 days. 

If you require any assistance, feel free to contact me. 
`;
  const emailElement = React.createElement(
    DefaultEmail,
    {
      name: user.getFullName(),
      message,
      admin: true,
      postMessage,
      url,
    },
    null,
  );
  const emailHtml = render(emailElement);

  try {
    await mailer({
      to: [user.email],
      from: "do.not.reply@thaumazo.org",
      subject: "Forgotten password request",
      html: emailHtml,
    });
  } catch (e) {
    errorLog(e, "Problem sending forgotten password request email");
    return { error: "There was an unexpected problem. Please try again later" };
  }
  return {
    success:
      "Password reset email was successfully sent. They will have two days to access their account",
  };
}
