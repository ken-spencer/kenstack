"use server";

import { redirect } from "next/navigation";

// import { revalidateTag } from 'next/cache'

import login from "./login";
import getLogMeta from "../log/meta";
import errorLog from "../log/error";
import { DateTime } from "luxon";

import LoginLog from "../models/LoginLog";

async function failResponse(email) {
  const errorMessage = `
    Please try again. If you are unable to sign in, use the “Forgotten your password” link below. 
    Your access will temporarily be suspended after three failed login attempts.
  `;

  const meta = getLogMeta();
  const log = new LoginLog({
    email,
    ip: meta.ip,
    geo: meta.geo,
  });

  try {
    await log.save();
  } catch (e) {
    errorLog(e, "Problem saving loginLog");
    return {
      error:
        "There was an unexpected connection problem. Please try again later.",
    };
  }

  return { error: errorMessage };
}

export default async function loginAction(state, formData, configs = {}) {
  const { redirect: redirectPath = thaumazoAdmin.path } = configs;
  let email = formData.get("email");
  email = email.trim().toLowerCase();

  const password = formData.get("password");

  if (!email) {
    return {
      error: "Email is required",
      fieldErrors: { email: "This is required field" },
    };
  }

  if (!password) {
    return {
      error: "Password is required",
      fieldErrors: { email: "This is required field" },
    };
  }

  const fifteenMinutesAgo = DateTime.now().minus({ minutes: 15 });

  let results;
  try {
    results = await LoginLog.find({
      email,
      createdAt: { $gte: fifteenMinutesAgo },
    }).countDocuments();
  } catch (e) {
    errorLog(e, "Problem retrieving loginLog");
    return {
      error:
        "There was an unexpected connection problem. Please try again later.",
    };
  }

  // Too many failed login attempts. Display an error.
  if (results >= 3) {
    return {
      error:
        "Your account has been temporarily locked due to multiple failed login attempts. Please wait 15 minutes before trying again. If you've forgotten your password, consider using the 'Forgot Password' option.",
    };
  }

  const User = await thaumazoModels.get("User");
  let user;
  try {
    user = await User.findOne({ email });
  } catch (e) {
    errorLog(e, "Problem loading the user");
    return {
      error:
        "There was an unexpected connection problem. Please try again later.",
    };
  }

  if (!user) {
    return await failResponse(email);
  }

  const success = await user.comparePassword(password);
  if (!success) {
    return await failResponse(email);
  }

  try {
    await login(user);
  } catch (e) {
    errorLog(e, "Problem logging in");
    return {
      error:
        "There was an unexpected connection problem. Please try again later.",
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return { authenticated: true, success: "You are logged in." };
}
