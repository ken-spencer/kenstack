"use client";

import type React from "react";
import * as z from "zod";

import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
import { getFormFieldErrors } from "@kenstack/forms/internal/fieldErrors";
import { useSubmitFailure } from "@kenstack/forms/internal/submitFailure";
import {
  FormProvider,
  useForm,
  type FormProviderProps,
  type FormSchema,
  type UseFormResult,
} from "./context";
import Notice from "./Notice";
// What each handler gets from the form.
type FormTools<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
> = Pick<
  UseFormResult<TResult, TVariables, z.input<TSchema>, z.output<TSchema>>,
  "form" | "mutation" | "setStatusError" | "setStatusMessage"
>;

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
    props: FormTools<TResult, TVariables, TSchema> & {
      data: z.output<TSchema>;
      event?: React.BaseSyntheticEvent;
      isDirty: boolean;
      changes: string[];
    },
  ) => void;
  onChange?: (
    props: Pick<FormTools<TResult, TVariables, TSchema>, "form"> & {
      event: React.FormEvent<HTMLFormElement>;
    },
  ) => void;
  onBlur?: (
    props: FormTools<TResult, TVariables, TSchema> & {
      event: React.FocusEvent<HTMLFormElement>;
    },
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
  mutationKey,
  onError,
  onSuccess,
  recaptchaAction,
  schema,
  validationMessage,
  children,
  ...props
}: FormProviderProps<TResult, TVariables, TSchema> &
  FormProps<TResult, TVariables, TSchema>) {
  return (
    <FormProvider
      mutationFn={mutationFn}
      mutationKey={mutationKey}
      apiPath={apiPath}
      guardUnsaved={guardUnsaved}
      initialStatusMessage={initialStatusMessage}
      schema={schema}
      defaultValues={defaultValues}
      onError={onError}
      onSuccess={onSuccess}
      recaptchaAction={recaptchaAction}
    >
      <Form
        onSubmit={onSubmit}
        onChange={onChange}
        onBlur={onBlur}
        validationMessage={validationMessage}
        {...props}
      >
        {children}
        {/* Every reCAPTCHA form must show the terms, so the form owns them. */}
        {recaptchaAction && <RecaptchaTerms />}
      </Form>
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
  const { setSubmitFailure } = useSubmitFailure();
  const {
    formState: { isDirty },
  } = form;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        // A repeated submit (Enter, a double click, a self-submitting field)
        // must not send the same request twice.
        if (form.formState.isSubmitting || mutation.isPending) {
          event.preventDefault();
          return;
        }
        if (uploadingFields.size) {
          event.preventDefault();
          setStatusMessage({
            status: "error",
            message: "Please wait for uploads to finish before saving.",
          });
          return;
        }

        setStatusMessage(null);
        setSubmitFailure(null);
        form.clearErrors();

        form.handleSubmit(
          async (data, submitEvent) => {
            await onSubmit({
              data,
              event: submitEvent,
              mutation,
              isDirty,
              changes: Object.keys(form.formState.dirtyFields),
              form,
              setStatusError,
              setStatusMessage,
            });
            // A handler can refuse the submit with its own field errors, such as a limit the schema
            // cannot know. The control holds the live errors; `formState` is the last render's.
            if (getFormFieldErrors(form.control._formState.errors).length) {
              setSubmitFailure({});
            }
          },
          () => setSubmitFailure({}),
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
