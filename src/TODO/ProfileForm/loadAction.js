"use server";

import authenticate from "../../auth/authenticate";

export default async function loadProfile() {
  const user = await authenticate();

  return {
    success: true,
    fields: {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
  };
}
