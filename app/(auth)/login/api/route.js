import errorResponse from "forms/errorResponse";
import login from "auth/login";
import errorLog from "log/error";
import successResponse from "forms/successResponse";
import { DateTime } from "luxon";

import User from "models/User";
import LoginLog from "models/LoginLog";

async function failResponse(request, email) {
  const errorMessage = `
    Please try again. If you are unable to sign in, use the “Forgotten your password” link below. 
    Your access will temporarily be suspended after three failed login attempts.
  `;
  const log = new LoginLog({
    email,
    ip: request.ip ?? "127.0.0.1",
    geo: request.geo,
  });

  try {
    await log.save();
  } catch (e) {
    errorLog(e, request, "Problem saving loginLog");
    return errorResponse("There was a problem. Please try again later.");
  }

  return errorResponse(errorMessage);
}

export async function POST(request) {
  if (request.headers.get("content-type") !== "application/json") {
    return errorResponse(
      "Invalid request. Please contact support if this problem persists.",
    );
  }

  const json = await request.json();
  let { email, password } = json.payload;

  email = email.trim().toLowerCase();

  if (!email) {
    return errorResponse("Email is required");
  }

  if (!password) {
    return errorResponse("Password is required");
  }

  const fifteenMinutesAgo = DateTime.now().minus({ minutes: 15 });

  let results;
  try {
    results = await LoginLog.find({
      email,
      createdAt: { $gte: fifteenMinutesAgo },
    }).count();
  } catch (e) {
    errorLog(e, request, "Problem retrieving loginLog");
    return errorResponse("There was a problem. Please try again later.");
  }

  // Too many failed login attempts. Display an error.
  if (results >= 3) {
    return errorResponse(
      "Your account has been temporarily locked due to multiple failed login attempts. Please wait 15 minutes before trying again. If you've forgotten your password, consider using the 'Forgot Password' option.",
    );
  }

  let user;
  try {
    user = await User.findOne({ email });
  } catch (e) {
    errorLog(e, request, "Problem loading the user");
    return errorResponse(
      "There was a problem loading your user. Please try again later",
    );
  }

  if (!user) {
    return await failResponse(request, email);
  }

  const success = await user.comparePassword(password);
  if (!success) {
    return await failResponse(request, email);
  }

  const { origin } = request.nextUrl;
  const response = successResponse("You have successfully been logged in", {
    action: "redirect",
    value: origin + "/",
  });

  try {
    await login(user, request, response);
  } catch (e) {
    errorLog(e, request, "Problem logging in");
    return errorResponse(
      "There was a problem logging in. Please try again later",
    );
  }
  return response;

  /* 

  if (!user) {
    return errorResponse("You need to be logged in to perform this action.", {
      action: "login",
    });
  }

  if (password !== confirm_password) {
    return errorResponse("The passwords you entered don't match.");
  }

  user.password = password;
  try {
    await user.saveLog(request, user);
  } catch (e) {
    errorLog(e, request, "Problem saving password update");
    return errorResponse(
      "There was a problem saving your password. Please try again later",
    );
  }

  auditLog(request, "resetPassword", `Password was reset`, { user });

*/
}
