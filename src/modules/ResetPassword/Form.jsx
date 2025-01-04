"use client";

import form from "./formData";
import { useMutation } from "@kenstack/query";
import AutoForm from "@kenstack/forms/AutoForm";

import apiAction from "@kenstack/client/apiAction";

const store = form.createStore();
export default function ResetPasswordForm({ apiPath }) {
  const mutation = useMutation({
    store,
    mutationFn: (formData) => {
      return apiAction(apiPath, formData);
    },
    onSuccess({ state }) {
      state.reset();
    },
  });

  return (
    <AutoForm
      // title="Reset your password"
      /*
      description={
        <span>
          Type your new password here. Make sure it has at least 8 characters.
          It should have both big and small letters and also a number.
        </span>
      }
      */
      form={form}
      store={store}
      mutation={mutation}
    />
  );
}
