"use client";
import { createContext, useContext } from "react";
import { useStore } from "zustand";

const FormContext = createContext({});

function FormProvider({ store, children }) {
  if (!store) {
    throw Error("FormProvider requires that a store be provided");
  }

  return (
    <FormContext.Provider value={{ store }}>{children}</FormContext.Provider>
  );
}

function useForm(selector) {
  const context = useContext(FormContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    const error = Error(
      "Unable to fetch form context. Please ensure that the form is wrapped with the <Provider>"
    );
    error.stack = error.stack.replace(/^.*\n/, "");
    throw error;
  }

  return useStore(context.store, selector);
}

function useFormStore() {
  const context = useContext(FormContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    const error = Error(
      "Unable to fetch form context. Please ensure that the form is wrapped with the <Provider>"
    );

    error.stack = error.stack.replace(/^.*\n/, "");
    throw error;
  }

  return context.store;
}

export { FormContext, FormProvider, useForm, useFormStore };
