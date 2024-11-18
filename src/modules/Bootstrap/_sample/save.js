"use server";

import saveAction from "@kenstack/modules/Bootstrap/saveAction";
import session from "@/session";

export default async function save(initial, formData) {
  return await saveAction(formData, { session });
}
