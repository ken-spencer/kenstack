"use client";

import type React from "react";
import * as z from "zod";

import {
  FormProvider,
  useForm,
  type FormProviderProps,
  type StatusMessage,
  type FormSchema,
} from "./context";
import { type FetchResult } from "@kenstack/lib/fetcher";
import { type UseFormReturn, type FieldValues } from "react-hook-form";

export type SetStatusMessage = React.Dispatch<
  React.SetStateAction<StatusMessage | null>
>;

import type { UseMutationResult } from "@tanstack/react-query";
type SubmitData<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
> = {
  data: TValues; //Record<string, unknown>;
  event?: React.BaseSyntheticEvent;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
  isDirty: boolean;
  form: UseFormReturn<TValues>;
  setStatusMessage: SetStatusMessage;
};

type ChangeData<TValues extends FieldValues> = {
  event: React.FormEvent<HTMLFormElement>;
  form: UseFormReturn<TValues>;
};

type BlurData<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
> = {
  event: React.FocusEvent<HTMLFormElement>;
  form: UseFormReturn<TValues>;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
  setStatusMessage: SetStatusMessage;
};

type FormProps<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
  TValues extends FieldValues = z.input<TSchema>,
> = Omit<React.ComponentProps<"form">, "onSubmit" | "onChange" | "onBlur"> & {
  onSubmit: (props: SubmitData<TResult, TVariables, TValues>) => void;
  onChange?: (props: ChangeData<TValues>) => void;
  onBlur?: (props: BlurData<TResult, TVariables, TValues>) => void;
};

export default function FormContainer<
  TResult extends Record<string, unknown>, // = {},
  TVariables extends Record<string, unknown>, // = Record<string, unknown>,
  TSchema extends FormSchema,
  TValues extends FieldValues = z.input<TSchema>,
>({
  defaultValues,
  onSubmit,
  onBlur,
  onChange,
  apiPath,
  mutationFn,
  onSuccess,
  schema,
  ...props
}: FormProviderProps<TResult, TVariables, TSchema, TValues> &
  FormProps<TResult, TVariables, TSchema, TValues>) {
  return (
    <FormProvider<TResult, TVariables, TSchema, TValues>
      mutationFn={mutationFn}
      apiPath={apiPath}
      schema={schema}
      defaultValues={defaultValues}
      onSuccess={onSuccess}
    >
      <Form<TResult, TVariables, TSchema, TValues>
        onSubmit={onSubmit}
        onChange={onChange}
        onBlur={onBlur}
        {...props}
      />
    </FormProvider>
  );
}

export function Form<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
  TValues extends FieldValues = z.input<TSchema>,
>({
  onSubmit,
  onChange,
  onBlur,
  ...props
}: FormProps<TResult, TVariables, TSchema, TValues>) {
  const { form, mutation, setStatusMessage } = useForm<
    TResult,
    TVariables,
    TValues
  >();
  const {
    formState: { isDirty },
  } = form;
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((data, event) =>
        onSubmit({
          data,
          event,
          mutation,
          isDirty,
          form,
          setStatusMessage,
        }),
      )}
      onBlur={
        onBlur
          ? (event) =>
              onBlur({
                event,
                mutation,
                form,
                setStatusMessage,
              })
          : undefined
      }
      onChange={onChange ? (event) => onChange({ event, form }) : undefined}
      {...props}
    />
  );
}
