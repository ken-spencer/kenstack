"use client";

import React from "react";

import Form from "../Form";
import Layout from "../Layout";
import RefererNotice from "@kenstack/components/Notice/RefererNotice";
import NoticeList from "@kenstack/components/Notice/List";

import Submit from "../Submit";

const empty = {};
export default function AutoForm({
  action: userAction,
  store,
  mutation,
  // values = empty,
  name = "",
  form,
  submit = "Submit",
  // buttons, // TODO should be "submit" (login) replace subit button with custom buttons
  submitClass = "",
  onSubmit = null,
  onChange = null,
  // onResponse = null,
  // reset: resetInitial = null,
  gap = "16px",
  state = empty,
  children = null,
}) {
  const action = React.useMemo(() => {
    if (userAction) {
      return async (...args) => {
        if (store) {
          store.setState({ pending: true });
        }

        const data = await userAction(...args);
        if (store) {
          store.setState({ pending: false });
          if (data?.error || typeof data.success === "string") {
            store.getState().addMessage(data);

            if (data.fieldErrors) {
              store.getState().setFieldErrors(data.fieldErrors);
            }
          }
        }
        return data;
      };
    }
  }, [userAction, store]);

  // const messages = useStore(store, (state) => state.messages);
  // const removeMessage = useStore(store, (state) => state.removeMessage);

  return (
    <Form
      store={store}
      action={action}
      mutation={mutation}
      onSubmit={onSubmit}
      onChange={onChange}
      // onResponse={onResponse}
      // reset={reset}
    >
      <RefererNotice className="mb-4" name={name} />
      <NoticeList store={store} />
      <div>{children || <Layout gap={gap} form={form} />}</div>

      <div className="mt-4">
        {(() => {
          /*
            if (buttons) {
              if (typeof buttons === "function") {
                return buttons();
              } else {
                return buttons;
              }
            }
          */

          let submitOptions = {};
          if (typeof submit === "string") {
            submitOptions.children = submit;
          } else if (typeof submit === "function") {
            return submit();
          } else if (React.isValidElement(submit)) {
            return submit;
          } else if (typeof submit === "object") {
            submitOptions = submit;
          }

          return <Submit {...submitOptions} />;
        })()}
      </div>
    </Form>
  );
}

/*
        <Grid gap={gap}>
        </Grid>
      */
