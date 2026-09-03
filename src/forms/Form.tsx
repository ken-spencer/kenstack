"use client";

import type React from "react";
import { type UseFormReturn, type FieldValues } from "react-hook-form";
import type { UseMutationResult } from "@tanstack/react-query";
import * as z from "zod";

import { type FetchResult } from "@kenstack/api/fetcher";
import {
  FormProvider,
  useForm,
  type FormProviderProps,
  type SetStatusError,
  type SetStatusMessage,
  type FormSchema,
} from "./context";
import Notice from "./Notice";
type SubmitData<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
  TSubmitValues extends FieldValues,
> = {
  data: TSubmitValues;
  event?: React.BaseSyntheticEvent;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
  isDirty: boolean;
  changes: string[];
  form: UseFormReturn<TValues, unknown, TSubmitValues>;
  setStatusError: SetStatusError;
  setStatusMessage: SetStatusMessage;
};

type ChangeData<
  TValues extends FieldValues,
  TSubmitValues extends FieldValues,
> = {
  event: React.FormEvent<HTMLFormElement>;
  form: UseFormReturn<TValues, unknown, TSubmitValues>;
};

type BlurData<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
  TSubmitValues extends FieldValues,
> = {
  event: React.FocusEvent<HTMLFormElement>;
  form: UseFormReturn<TValues, unknown, TSubmitValues>;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
  setStatusError: SetStatusError;
  setStatusMessage: SetStatusMessage;
};

type FormProps<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
> = Omit<
  React.ComponentProps<"form">,
  "onSubmit" | "onChange" | "onBlur" | "onError"
> & {
  validationMessage?: React.ReactNode;
  onSubmit: (
    props: SubmitData<TResult, TVariables, z.input<TSchema>, z.output<TSchema>>,
  ) => void;
  onChange?: (props: ChangeData<z.input<TSchema>, z.output<TSchema>>) => void;
  onBlur?: (
    props: BlurData<TResult, TVariables, z.input<TSchema>, z.output<TSchema>>,
  ) => void;
};

export default function FormContainer<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
>({
  defaultValues,
  onSubmit,
  onBlur,
  onChange,
  apiPath,
  guardUnsaved,
  initialStatusMessage,
  mutationFn,
  onError,
  onSuccess,
  schema,
  validationMessage,
  ...props
}: FormProviderProps<TResult, TVariables, TSchema> &
  FormProps<TResult, TVariables, TSchema>) {
  return (
    <FormProvider
      mutationFn={mutationFn}
      apiPath={apiPath}
      guardUnsaved={guardUnsaved}
      initialStatusMessage={initialStatusMessage}
      schema={schema}
      defaultValues={defaultValues}
      onError={onError}
      onSuccess={onSuccess}
    >
      <Form
        onSubmit={onSubmit}
        onChange={onChange}
        onBlur={onBlur}
        validationMessage={validationMessage}
        {...props}
      />
    </FormProvider>
  );
}

export function Form<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
>({
  onSubmit,
  onChange,
  onBlur,
  validationMessage,
  children,
  ...props
}: FormProps<TResult, TVariables, TSchema>) {
  const { form, mutation, setStatusError, setStatusMessage, uploadingFields } =
    useForm<TResult, TVariables, z.input<TSchema>, z.output<TSchema>>();
  const {
    formState: { isDirty },
  } = form;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        if (uploadingFields.size) {
          event.preventDefault();
          setStatusMessage({
            status: "error",
            message: "Please wait for uploads to finish before saving.",
          });
          return;
        }

        setStatusMessage(null);
        form.clearErrors();

        form.handleSubmit((data, submitEvent) =>
          onSubmit({
            data,
            event: submitEvent,
            mutation,
            isDirty,
            changes: Object.keys(form.formState.dirtyFields),
            form,
            setStatusError,
            setStatusMessage,
          }),
        )(event);
      }}
      onBlur={
        onBlur
          ? (event) =>
              onBlur({
                event,
                mutation,
                form,
                setStatusError,
                setStatusMessage,
              })
          : undefined
      }
      onChange={onChange ? (event) => onChange({ event, form }) : undefined}
      {...props}
    >
      <Notice validationMessage={validationMessage} />
      {children}
    </form>
  );
}
