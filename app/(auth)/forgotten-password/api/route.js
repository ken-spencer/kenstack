import { NextResponse } from "next/server";
import mailer from "utils/mailer";

import errorLog from "log/error";
import auditLog from "log/audit";
import User from "models/User";
import ForgottenPassword from "models/ForgottenPassword";

import React from "react";
import Email from "../Email";
import { render } from "@react-email/render";

export async function POST(request) {
  if (request.headers.get("content-type") !== "application/json") {
    const response = NextResponse.json({
      type: "error",
      message:
        "Invalid request. Please contact support if this problem persists.",
    });

    return response;
  }

  const json = await request.json();

  let { email } = json.payload;

  if (!email) {
    const response = NextResponse.json({
      type: "error",
      message: "Invalid request. No email address was recieved.",
    });

    return response;
  }

  email = email.trim().toLowerCase();

  const success = NextResponse.json({
    type: "success",
    message: `An email has been sent to ${email}. Please open and follow the provided instructions to reset your password.`,
  });

  const errorResponse = NextResponse.json({
    type: "error",
    message:
      "We experienced a problem resetting your password. Please try again later.",
  });

  const user = await User.findOne({ email });

  // send this message on success or fail as we don't want to provide a way to scrape membership.
  if (!user) {
    // might as well slow things down a bit on fail.
    auditLog(
      request,
      "forgottenPasswordMiss",
      `Forgotten Password; No user found with email: ${email}`,
      { email },
    );
    return await new Promise((res) => setTimeout(() => res(success), 6000));
  }

  // make sure there are not too many requests happening over time to avoid abuse
  let results;
  try {
    results = await ForgottenPassword.find({
      user: user._id,
      expiry: { $gte: new Date() },
    }).count();
  } catch (e) {
    errorLog(e, request, "Problem retrieving forgotten password log");
    return errorResponse;
  }

  // let's avoid this feature being used to spam
  if (results >= 3) {
    auditLog(
      request,
      "forgottenPasswordFlood",
      `Forgotten Password; Too many requests`,
      { user },
    );

    const response = NextResponse.json({
      type: "error",
      message:
        "We have recieved to many requests to reset this user's password. Please try again later.",
    });

    return await new Promise((res) => setTimeout(() => res(response), 6000));
  }

  const fp = new ForgottenPassword({
    user,
    ip: request.ip ?? "127.0.0.1",
    geo: request.geo,
  });

  try {
    await fp.saveLog(request, user);
  } catch (e) {
    errorLog(e, request, "Problem saving forgotten password request");
    return errorResponse;
  }

  const url = request.nextUrl.origin + "/forgotten-password/" + fp.token;
  const emailElement = React.createElement(
    Email,
    {
      name: user.getFullName(),
      url,
      ip: request.ip,
      ...request.geo,
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
    errorLog(e, request, "Problem sending forgotten password request email");
    return errorResponse;
  }

  return success;
}
