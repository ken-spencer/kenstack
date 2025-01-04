"use client";

import AutoForm from "@kenstack/forms/AutoForm";
import Submit from "./Submit";
import form from "./formData";
import { useMutation } from "@kenstack/query";

import apiAction from "@kenstack/client/apiAction";
import { useForgottenPassword } from "./context";

const store = form.createStore();
export default function ForgottenPasswordForm({ action }) {
  const { apiPath } = useForgottenPassword();

  const mutation = useMutation({
    store,
    mutationFn: (formData) => {
      return apiAction(apiPath, formData);
    },
    onSuccess: ({ state }) => {
      state.reset();
    },
  });

  return (
    <AutoForm
      name="forgottenPassword"
      form={form}
      store={store}
      mutation={mutation}
      submit={Submit}
    />
  );
}
