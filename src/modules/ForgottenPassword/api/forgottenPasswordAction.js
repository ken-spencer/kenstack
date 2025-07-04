"use server";

import { geolocation } from "@vercel/functions";

import mailer from "@kenstack/lib/mailer";

import errorLog from "../../../log/error";
import auditLog from "../../../log/audit";
import ForgottenPassword from "../models/ForgottenPassword";

import React from "react";
import { render } from "@react-email/render";

const errorResponse = {
  error:
    "We experienced a problem resetting your password. Please try again later.",
};

export default async function forgottenPasswordAction(
  formData,
  { Email, attachments, from = "nobody@nowhere.com", session, request } = {}
) {
  const User = session.userModel;
  // const Email = CustomEmail || DefaultEmail;

  let id = formData.get("id");
  let email;
  // special case when sending from admin
  let administrator;
  let user;
  if (id) {
    if ((await session.hasRole("ADMIN")) !== true) {
      return { error: "You do not have permission to perform this action" };
    }
    administrator = await session.getAuthenticatedUser();
    user = await User.findById(id);

    if (!user) {
      return { error: "Unknown user" };
    }
    email = user.email;
  } else {
    email = formData.get("email") ?? "";

    email = email.trim().toLowerCase();

    if (!email) {
      return {
        error: "Invalid request. No email address was recieved.",
        fieldErrors: { email: "Please enter a valid email address" },
      };
    }

    user = await User.findOne({ email });
  }

  // send this message on success or fail as we don't want to provide a way to scrape membership.
  if (!user) {
    // might as well slow things down a bit on fail.
    auditLog(
      "forgottenPasswordMiss",
      `Forgotten Password; No user found with email: ${email}`,
      { email }
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
    }).countDocuments();
  } catch (e) {
    errorLog(e, "Problem retrieving forgotten password log");
    return errorResponse;
  }

  // let's avoid this feature being used to spam
  if (results >= 3) {
    auditLog(
      "forgottenPasswordFlood",
      `Forgotten Password; Too many requests`,
      { user }
    );

    let response = {
      error:
        "We have recieved to many requests to reset this user's password. Please try again later.",
    };
    return await new Promise((res) => setTimeout(() => res(response), 6000));
  }

  const fp = new ForgottenPassword({
    user,
    ip: request.ip || "127.0.0.1",
    geo: geolocation(request),
  });

  try {
    await fp.saveLog(user);
  } catch (e) {
    errorLog(e, "Problem saving forgotten password request");
    return errorResponse;
  }

  const url =
    request.nextUrl.protocol +
    "//" +
    request.headers.get("host") +
    session.forgottenPasswordPath +
    "/" +
    fp.token;

  const emailElement = React.createElement(
    Email,
    {
      name: user.getFullName(),
      url,
      ip: request.ip || "127.0.0.1",
      ...geolocation(request),
      admin: administrator ? {} : null,
    },
    null
  );
  const emailHtml = await render(emailElement);

  try {
    await mailer({
      to: [user.email],
      from: from,
      subject: "Forgotten password request",
      html: emailHtml,
      attachments,
    });
  } catch (e) {
    errorLog(e, "Problem sending forgotten password request email");
    return errorResponse;
  }

  return {
    success: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
  };
}
