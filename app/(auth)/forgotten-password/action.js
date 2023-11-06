"use server";

import Email from "./Email";
import forgottenPasswordAction from "@thaumazo/cms/auth/forgottenPasswordAction";

export default async function action(initial, data) {
  return await forgottenPasswordAction(initial, data, { Email });
}
