"use client";

import { useMutation } from "@kenstack/query";
import AutoForm from "@kenstack/forms/AutoForm";
import form from "./formData";
import Submit from "./Submit";

import apiAction from "@kenstack/client/apiAction";
import { useLogin } from "./context";

const store = form.createStore();
export default function LoginForm({ className, children }) {
  const { apiPath } = useLogin();
  const mutation = useMutation({
    mutationFn: ({ formData }) => {
      return apiAction(apiPath, formData);
    },
    store,
  });

  return (
    <AutoForm
      name="loginError"
      form={form}
      store={store}
      mutation={mutation}
      className={className}
    >
      {children || Submit}
    </AutoForm>
  );
}
