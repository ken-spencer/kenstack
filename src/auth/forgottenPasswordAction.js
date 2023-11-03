"use server";

import meta from "log/meta";

import { headers } from "next/headers";
import mailer from "utils/mailer";

import errorLog from "log/error";
import auditLog from "log/audit";
import User from "models/User";
import ForgottenPassword from "models/ForgottenPassword";

import React from "react";
import { render } from "@react-email/render";

export default async function forgottenPasswordAction(
  initial,
  data,
  { Email },
) {
  let email = data.get("email") ?? "";
  email = email.trim().toLowerCase();

  if (!email) {
    return {
      error: "Invalid request. No email address was recieved.",
      fieldErrors: { email: "Please enter a valid email address" },
    };
  }

  const errorResponse = {
    error:
      "We experienced a problem resetting your password. Please try again later.",
  };

  const user = await User.findOne({ email });

  // send this message on success or fail as we don't want to provide a way to scrape membership.
  if (!user) {
    // might as well slow things down a bit on fail.
    auditLog(
      "forgottenPasswordMiss",
      `Forgotten Password; No user found with email: ${email}`,
      { email },
    );

    let response = {
      error: `No account has been found matching ${email}.`,
    };

    return await new Promise((res) => setTimeout(() => res(response), 6000));
  }

  // make sure there are not too many requests happening over time to avoid abuse
  let results;
  try {
    results = await ForgottenPassword.find({
      user: user._id,
      expiry: { $gte: new Date() },
    }).count();
  } catch (e) {
    errorLog(e, "Problem retrieving forgotten password log");
    return errorResponse;
  }

  // let's avoid this feature being used to spam
  if (results >= 3) {
    auditLog(
      "forgottenPasswordFlood",
      `Forgotten Password; Too many requests`,
      { user },
    );

    let response = {
      error:
        "We have recieved to many requests to reset this user's password. Please try again later.",
    };
    return await new Promise((res) => setTimeout(() => res(response), 6000));
  }

  const fp = new ForgottenPassword({
    user,
    ip: meta.ip,
    geo: meta.geo,
  });

  try {
    await fp.saveLog(user);
  } catch (e) {
    errorLog(e, "Problem saving forgotten password request");
    return errorResponse;
  }

  const url = headers().get("origin") + "/forgotten-password/" + fp.token;
  const emailElement = React.createElement(
    Email,
    {
      name: user.getFullName(),
      url,
      ip: meta.ip,
      ...meta.geo,
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
    return errorResponse;
  }

  return {
    success: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
  };
}
