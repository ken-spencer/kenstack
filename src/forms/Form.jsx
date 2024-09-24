import React, { useCallback, useRef, useEffect } from "react";
import useForm from "./useForm";
import useConfirm from "./useConfirm";
// import FormHelper from "./FormHelper";

export default function Form({
  confirm = false,
  onSubmit = null,
  onResponse = null,
  children = null,
  reset: resetInitial,
  ...props
}) {
  const reset =
    resetInitial === undefined ? !Boolean(onResponse) : resetInitial;
  const form = useForm();

  useConfirm(confirm);

  const lastState = useRef();
  useEffect(() => {
    if (form.initialState !== form.state && lastState.current !== form.state) {
      if (onResponse) {
        const evt = new Event("response");
        onResponse(evt, form);
      }

      if (reset && form?.state.success) {
        form.reset();
      }
    }
    lastState.current = form.state;
  }, [form, form.initialState, form.state, onResponse, reset]);

  const handleSubmit = useCallback(
    (evt) => {
      form.showErrors = true;

      if (form.noValidate == false && form.invalid) {
        evt.preventDefault();

        const input = form.ref.current.querySelector(":invalid");
        if (input) {
          input.focus();
        }

        return;
      }
      form.showErrors = false;

      if (onSubmit) {
        onSubmit(evt, form);
      }
    },
    [form, onSubmit],
  );

  // block native form validation UX
  const handleInvalid = useCallback((evt) => {
    evt.preventDefault();
  }, []);

  return (
    <form
      noValidate
      ref={form.ref}
      {...props}
      onSubmit={handleSubmit}
      onInvalid={handleInvalid}
      action={form.action}
    >
      {children}
    </form>
  );
}
//      <FormHelper />
