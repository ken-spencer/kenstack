"use server";

import Email from "./Email";
import forgottenPasswordAction from "auth/forgottenPasswordAction";

export default async function action(initial, data) {
  return await forgottenPasswordAction(initial, data, { Email });
}
