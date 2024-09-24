"use client";

import React from "react";

// import Grid from "../Grid";
// import Item from "../Grid/Item";

import Provider from "../Provider";
import Form from "../Form";
import Layout from "../Layout";
import Notice from "../Notice";

import Submit from "../Submit";

const empty = {};
export default function AutoForm({
  action,
  values = empty,
  // title,
  name = "",
  // description,
  fields,
  submit = "Submit",
  // buttons, // TODO should be "submit" (login) replace subit button with custom buttons
  submitClass="",
  onSubmit = null,
  onChange = null,
  onResponse = null,
  reset: resetInitial = null,
  gap = "16px",
  state = empty,
  children = null,
}) {
  const reset =
    resetInitial === null ? !Boolean(onResponse) : resetInitial;

  return (
    <Provider state={state} action={action} values={values}>
      <Form
        onSubmit={onSubmit}
        onChange={onChange}
        onResponse={onResponse}
        reset={reset}
      >
 
          {/*
          {title && (
            <Item>
              {(() => {
                if (React.isValidElement(title)) {
                  return title;
                } else if (typeof title === "string") {
                  return <h2>{title}</h2>;
                }
              })()}
            </Item>
          )}

          {description && (
            <Item>
              {(() => {
                if (React.isValidElement(description)) {
                  return description;
                } else if (typeof description === "string") {
                  return <p>{description}</p>;
                }
              })()}
            </Item>
          )}
          */}

          <Notice className="mb-4" name={name} />

          <div>{children || <Layout gap={gap} fields={fields} />}</div>

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
    </Provider>
  );
}

      /*
        <Grid gap={gap}>
        </Grid>
      */
