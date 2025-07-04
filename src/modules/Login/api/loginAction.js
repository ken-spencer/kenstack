"use server";

// import { redirect } from "next/navigation";

// import { revalidateTag } from 'next/cache'

import { DateTime } from "luxon";

import LoginLog from "../models/LoginLog";

export default async function loginAction(
  formData,
  { session, request, response, logMeta }
) {
  let email = formData.get("email");
  email = email.trim().toLowerCase();
  if (!email) {
    return {
      error: "Email is required",
      fieldErrors: { email: "This is required field" },
    };
  }

  const password = formData.get("password");
  if (!password) {
    return {
      error: "Password is required",
      fieldErrors: { password: "This is required field" },
    };
  }

  const fifteenMinutesAgo = DateTime.now().minus({ minutes: 15 });

  const results = await LoginLog.find({
    email,
    createdAt: { $gte: fifteenMinutesAgo },
  }).countDocuments();

  // Too many failed login attempts. Display an error.
  if (results >= 3) {
    return {
      error:
        "Your account has been temporarily locked due to multiple failed login attempts. Please wait 15 minutes before trying again. If you've forgotten your password, consider using the 'Forgot Password' option.",
    };
  }

  const User = session.userModel;
  const user = await User.findOne({ email });

  if (!user) {
    return await failResponse(email, logMeta);
  }

  const success = await user.comparePassword(password);
  if (!success) {
    return await failResponse(email, logMeta);
  }

  await session.login(user, response);

  const homePath = await session.getHomePath(user, request);
  return {
    authenticated: true,
    redirect: homePath,
  };
}

async function failResponse(email, meta) {
  const errorMessage = `
    Please try again. If you are unable to sign in, use the “Forgotten your password” link below. 
    Your access will temporarily be suspended after three failed login attempts.
  `;

  const log = new LoginLog({
    email,
    ip: meta.ip,
    geo: meta.geo,
  });

  await log.save();

  return { error: errorMessage };
}
