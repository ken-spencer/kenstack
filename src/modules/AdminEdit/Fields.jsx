"use client";

import { useAdminEdit } from "./context";

import Layout from "@admin/forms/Layout";

export default function AdminEditFields() {
  const { admin } = useAdminEdit();

  const fields = admin.getFields();

  return (
    <div className="admin-body">
      <Layout fields={fields} />
    </div>
  );
}
