"use client";

// Set which fields have errorsin a set. Trigger re render on form if set changes betweeon 0 and 1

import { useActionState, useReducer, useRef, useMemo, useEffect } from "react";

const reducer = (count) => count + 1;

import FormContext from "./Context";
import GlobalFormState from "./lib/GlobalFormState";

const empty = {};
export default function FormProvider({
  children,
  values: initialValues = empty,
  disabled = false, // Disable entire form
  fieldProps = empty, // pass props to all fields
  noValidate: initialNoValidate = false,
  action = null, // async function to be used in a server action
  state: initialState = empty,
}) {
  const formRef = useRef();
  const [, reRender] = useReducer(reducer, 0);

  const form = useMemo(() => {
    const newForm = new GlobalFormState();
    Object.assign(newForm, {
      reRender: reRender,
      ref: formRef,
      initialValues: initialValues,
    });

    newForm.initProp("showErrors", false);
    newForm.initProp("noValidate", initialNoValidate);
    newForm.initProp("disabled", disabled);
    newForm.initProp("fieldProps", fieldProps);
    return newForm;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [formState, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  form.action = action ? formAction : null;
  form.pending = action ? isPending : null;
  if (action) {
    form.state = formState;
  }
  form.initialState = initialState;
  form.disabled = disabled;
  form.fieldProps = fieldProps;

  const initialRender = useRef(false);
  useEffect(() => {
    // Need to put in this extra logic as useEffect fires twice in dev mode
    if (initialRender.current && initialRender.current !== initialValues) {
      form.init(initialValues);
    }
    initialRender.current = initialValues;
  }, [initialValues, form]);

  if (action && typeof form.state !== "object") {
    throw Error("Invalid response received from server action");
  }

  const context = useMemo(
    () => {
      return { form };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form,
      form.state,
      form.initialState,
      form.initialValues,
      form.memo,
      form.action,
      form.pending,
      form.showErrors,
    ],
  );

  return (
    <FormContext.Provider value={context}>{children}</FormContext.Provider>
  );
}
