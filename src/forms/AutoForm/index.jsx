"use client";

import React from "react";

import Grid from "../Grid";
import Item from "../Grid/Item";

import Provider from "../Provider";
import Form from "../Form";
import Layout from "../Layout";
import Notice from "../Notice";

import Submit from "../Submit";

const empty = {};
export default function AutoForm({
  action,
  values,
  title,
  name,
  description,
  fields,
  submit = "Submit",
  buttons, // replace subit button with custom buttons
  onSubmit,
  onChange,
  onResponse,
  reset: resetInitial,
  gap = "16px",
  state = empty,
  children,
}) {
  const reset =
    resetInitial === undefined ? (onResponse ?? false) : resetInitial;

  return (
    <Provider state={state} action={action} values={values}>
      <Form
        onSubmit={onSubmit}
        onChange={onChange}
        onResponse={onResponse}
        reset={reset}
      >
        <Grid gap={gap}>
          {title && (
            <Item>
              {(() => {
                if (React.isValidElement(title)) {
                  return title;
                } else if (typeof title === "string") {
                  return <h2>{title}</h2>;
                }

                /*
                let titleOptions = {
                  variant: "h4",
                };

                if (typeof title === "string") {
                  titleOptions.children = title;
                } else if (typeof title === "object") {
                  titleOptions = {
                    ...titleOptions,
                    ...title,
                  };
                }
                return <h2 {...titleOptions} />;
                */
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

                /*
                let descriptionOptions = {
                  variant: "subtitle1",
                };

                if (typeof description === "string") {
                  descriptionOptions.children = description;
                } else if (typeof description === "object") {
                  descriptionOptions.children = {
                    ...descriptionOptions,
                    ...description,
                  };
                }
                return <div {...descriptionOptions} />;
                */
              })()}
            </Item>
          )}

          <Item hideIfEmpty>
            <Notice name={name} />
          </Item>
          <Item>{children || <Layout gap={gap} fields={fields} />}</Item>
          <Item>
            {(() => {
              if (buttons) {
                if (typeof buttons === "function") {
                  return buttons();
                } else {
                  return buttons;
                }
              }

              let submitOptions = {};
              if (typeof submit === "string") {
                submitOptions.children = submit;
              } else if (typeof submit === "object") {
                submitOptions = submit;
              }

              return <Submit {...submitOptions} />;
            })()}
          </Item>
        </Grid>
      </Form>
    </Provider>
  );
}
