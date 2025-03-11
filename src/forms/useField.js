"use client"

import { useEffect, useMemo, useId, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { twMerge } from "tailwind-merge";
// import { useStore } from "zustand";
import checkValue from "./validity/checkValue";

import omit from "lodash/omit";
// import useValidity from "./validity/useValidity";
import { useForm, useFormStore } from "./context";

const defaultGlobal = {
  initialized: false,
  lastInteraction: null,
};
let global = { ...defaultGlobal };

export default function useField(props) {
  const { name } = props;
  if (!name) {
    throw Error("Name is required.");
  }

  const defaultRef = useRef();
  const ref = props.ref || defaultRef;
  const store = useFormStore();
  const { field, fieldError, ...form } = useForm(
    useShallow((s) => ({
      initialValues: s.initialValues,
      noValidate: s.noValidate,
      showErrors: s.showErrors,
      disabled: s.disabled,
      pending: s.pending,
      field: s.fields[name],
      fieldError: s.fieldErrors[name] || null, // error returned from the server
    })),
  );

  // initialize field on first render without triggering rerender
  if (!field.ref) {
    field.ref = ref;
    store.setState((state) => {
      state.fields[name] = field;
      return state;
    });
  }
  // const field = form.useFieldStore(name, props.ref || ref);
  // const errorMessage = useValidity(field, props, props.ref || ref);
  const rawId = useId(); // Call the hook at the top level
  const id = useMemo(() => name + "-" + rawId.slice(2, -1), [name, rawId]);

  useEffect(() => {
    if (global.initialized) {
      return;
    }
    global.initialized = true;

    const handleClick = () => (global.lastInteraction = "click");
    document.addEventListener("mousedown", handleClick);
    const handleKeyDown = () => (global.lastInteraction = "key");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      global = { ...defaultGlobal };
    };
  }, []);

  // const [change, reRender] = useReducer(reducer, 0);
  // useEffect(() => {
  //   form.notifySubscribers(name);
  // }, [form, name, change]);

  // const { [name]: initial = "" } = form.initialValues || {};

  const returnProps = useMemo(() => {
    let retval = {
      id,
      ref,
      ...omit(props, [
        "label",
        "message",
        "email",
        "unique",
        "password",
        "matches",
        "containerClass",
        "labelClass",
        "inputClass",
      ]),
    };
    if (form.disabled || form.pending) {
      retval.disabled = true;
    }

    if (retval.required === "required") {
      retval.required = true;
      throw Error("This is used: required is a string");
    }

    if (typeof retval.pattern === "object") {
      retval.pattern = retval.pattern.pattern;
    }

    return retval;
  }, [props, form, id, ref]);

  const returnEvents = useMemo(() => {
    let retval = {};
    retval.onChange = (evt) => {
      if (props.onChange) {
        props.onChange(evt, field);
      }
      const input = evt.target;
      field.setValue(input.value);
    };

    retval.onBlur = (evt) => {
      if (props.onBlur) {
        props.onBlur(evt, field);
      }
      // Dot set blur unless leving checkbox list or radio list
      if (
        !evt.relatedTarget ||
        evt.target.nodeName !== evt.relatedTarget.nodeName ||
        evt.target.name !== evt.relatedTarget.name
      ) {
        field.setBlurred(true);
        const state = store.getState();
        if (
          // otherwise results in submit failing when submit button is pressed
          (global.lastInteraction === "key" ||
            !evt.relatedTarget ||
            evt.relatedTarget.nodeName !== "BUTTON") &&
          !state.noValidate &&
          field.interacted
        ) {
          field.setError(
            checkValue(field.name, field, store.getState().values),
          );
        }
      }
    };

    return retval;
  }, [props, store, field]);

  const fieldProps = useMemo(() => {
    let retval = {
      htmlFor: id,
      containerClass: twMerge(field.containerClass, props.containerClass),
      labelClass: twMerge(field.labelClass, props.labelClass),
      label: field.label,
      error: fieldError || field.error,
    };
    return retval;
  }, [
    props,
    id,
    // containerClass,
    field.containerClass,
    // labelClass,
    field.labelClass,
    field.label,
    field.error,
    fieldError, // error returned from the server
    // errorMessage,
  ]);

  return { field, props: { ...returnProps, ...returnEvents }, fieldProps };
}

// onChange,
// onBlur,
// containerClass = "",
// labelClass = "",
// inputClass = "",
