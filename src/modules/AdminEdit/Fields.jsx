"use client";

import { useAdminEdit } from "./context";

import Layout from "@kenstack/forms/Layout";

export default function AdminEditFields() {
  const { admin } = useAdminEdit();

  const fields = admin.getFields();

  return (
    <div>
      <Layout fields={fields} />
    </div>
  );
}
