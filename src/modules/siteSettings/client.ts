"use client";

import { adminClient } from "@kenstack/admin/client";
import EditForm from "./components/EditForm";
import { fields } from "./fields";

export default adminClient({ fields, EditForm });
