"use client";

import AutoForm from "@kenstack/forms/AutoForm";
import form from "./formData";
const store = form.createStore();

export default function AdminBootstrapForm({ action }) {
  return (
    <AutoForm
      // title="Setup Admin Account"
      action={action}
      form={form}
      store={store}
      submit="Create account"
    />
  );
}
