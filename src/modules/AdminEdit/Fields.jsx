"use client";

import { useAdminEdit } from "./context";

import Layout from "@kenstack/forms/Layout";

export default function AdminEditFields() {
  const { admin } = useAdminEdit();

  return (
    <div>
      <Layout form={admin.form} />
    </div>
  );
}
