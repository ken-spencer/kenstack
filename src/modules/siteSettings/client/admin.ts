"use client";

import { defineAdminClient } from "@kenstack/admin/client";
import EditForm from "../components/EditForm";
import { fields } from "../fields";

export default defineAdminClient({
  fields,
  EditForm,
});
