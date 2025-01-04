import React, { useCallback } from "react";
import { FormProvider } from "./context";
// import useConfirm from "./useConfirm";
// import FormHelper from "./FormHelper";

export default function Form({
  store,
  action = null,
  mutation = null,
  confirm = false,
  onSubmit = null,
  onResponse = null,
  children = null,
  ...props
}) {
  // useConfirm(confirm);

  const handleSubmit = useCallback(
    (evt) => {
      const state = store.getState();

      if (state.pending) {
        evt.preventDefault();
        return;
      }

      if (state.noValidate == false && state.invalid) {
        state.setShowErrors(true);
        evt.preventDefault();

        for (let field of Object.values(state.fields)) {
          if (field.error && field.ref?.current) {
            field.ref.current.focus();
            break;
          }
        }

        return;
      }

      if (onSubmit) {
        onSubmit(evt, form);
      }

      if (mutation) {
        evt.preventDefault();
        const formData = new FormData(evt.currentTarget);
        // get value from submit button.
        const { submitter } = evt.nativeEvent;
        if (submitter?.name) {
          formData.set(submitter.name, submitter.value);
        }
        mutation.mutate(formData);
      }
    },
    [store, onSubmit, mutation],
  );

  // block native form validation UX
  const handleInvalid = useCallback((evt) => {
    evt.preventDefault();
  }, []);

  return (
    <FormProvider store={store}>
      <form
        noValidate
        {...props}
        onSubmit={handleSubmit}
        onInvalid={handleInvalid}
        action={action}
      >
        {children}
      </form>
    </FormProvider>
  );
}
//      <FormHelper />
