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
  // onResponse = null,
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

      if (state.uploading.size) {
        evt.preventDefault();
        state.addMessage({
          error: "Unable to submit while upload is in progress.",
        });
        return;
      }

      if (state.noValidate == false && state.invalid) {
        state.setShowErrors(true);
        evt.preventDefault();

        // wait for side effects in setShowErrors. There is probably a cleaner way.
        setTimeout(() => {
          // get state again to reflect new value;
          const { fields } = store.getState();

          for (let field of Object.values(fields)) {
            if (field.error && field.ref?.current) {
              field.ref.current.focus();
              break;
            }
          }
        }, 50);

        return;
      }

      if (onSubmit) {
        onSubmit(evt, state);
      }

      if (mutation) {
        evt.preventDefault();
        const formData = new FormData(evt.currentTarget);
        // get value from submit button.
        const { submitter } = evt.nativeEvent;
        if (submitter?.name) {
          formData.set(submitter.name, submitter.value);
        }
        let values = { ...state.values };
        if (submitter?.name) {
          values[submitter.name] = submitter.value;
        }
        mutation.mutate({ formData, values, submitter });
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
