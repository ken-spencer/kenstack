"use client";

import form from "./formData";
import { useMutation } from "@kenstack/query";
import AutoForm from "@kenstack/forms/AutoForm";

import apiAction from "@kenstack/client/apiAction";

const store = form.createStore();
export default function ResetPasswordForm({ apiPath, className, children }) {
  const mutation = useMutation({
    store,
    mutationFn: ({ formData }) => {
      return apiAction(apiPath, formData);
    },
    onSuccess({ state }) {
      state.reset();
    },
  });

  return (
    <AutoForm
      form={form}
      store={store}
      mutation={mutation}
      className={className}
    >
      {children}
    </AutoForm>
  );
}
