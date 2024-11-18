"use client";

import AutoForm from "@kenstack/forms/AutoForm";
import fields from "./fields";

export default function AdminBootstrapForm({ saveAction }) {
  return (
    <div>
      <AutoForm
        title="Setup Admin Account"
        action={saveAction}
        fields={fields}
        submit="Create account"
      />
    </div>
  );
}
