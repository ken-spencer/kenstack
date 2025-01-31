"use server";

import saveAction from "@kenstack/modules/Bootstrap/saveAction";
import { session } from "@/config/server";

export default async function save(formData) {
  return await saveAction(formData, { session });
}
