import { cookies } from "next/headers";

import { getUsersModule } from "@kenstack/auth/server/getUsersModule";
import { loadAuthState } from "@kenstack/auth/server/state";
import { loginMethodCookie, type LoginMethod } from "./method";

export async function loadLoginFormProps() {
  const storedMethod = (await cookies()).get(loginMethodCookie)?.value;
  const authState = await loadAuthState();
  const method: LoginMethod | undefined =
    storedMethod === "email" || storedMethod === "password"
      ? storedMethod
      : undefined;
  const { passwordPath } = getUsersModule();

  if (authState.state === "code-sent") {
    return {
      challengeKey: authState.challengeKey,
      email: authState.email,
      method,
      passwordPath,
    };
  }

  return { method, passwordPath };
}
