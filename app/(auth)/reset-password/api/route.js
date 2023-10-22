import errorResponse from "forms/errorResponse";
import loadUser from "auth/loadUser";
import auditLog from "log/audit";
import errorLog from "log/error";
import successResponse from "forms/successResponse";

export async function POST(request) {
  if (request.headers.get("content-type") !== "application/json") {
    return errorResponse(
      "Invalid request. Please contact support if this problem persists.",
    );
  }

  let user;
  try {
    user = await loadUser(request);
  } catch (e) {
    errorLog(e, request, "Problem loading the user");
    return errorResponse(
      "There was a problem loading your user. Please try again later",
    );
  }

  if (!user) {
    return errorResponse("You need to be logged in to perform this action.", {
      action: "login",
    });
  }

  const json = await request.json();
  const { password, confirm_password } = json.payload;

  if (password !== confirm_password) {
    return errorResponse("The passwords you entered don't match.");
  }

  if (
    !password ||
    !password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\S]{8,}$/)
  ) {
    return errorResponse(
      "Password must be at least 8 characters; include both big and small letters and a number.",
    );
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

  return successResponse("Your password has successfully been saved.");
}
