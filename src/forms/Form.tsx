"use client";

import {
  FormProvider,
  useForm,
  type FormProviderProps,
  type StatusMessage,
} from "./context";
import { type FetchResult } from "@kenstack/lib/fetcher";
import { type UseFormReturn } from "react-hook-form";

import type { UseMutationResult } from "@tanstack/react-query";
type SubmitData<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>
> = {
  data: TVariables; //Record<string, unknown>;
  event: React.BaseSyntheticEvent<
    SubmitEvent,
    HTMLFormElement,
    HTMLFormElement
  >;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
  isDirty: boolean;
  form: UseFormReturn<TVariables>;
  setStatusMessage: React.Dispatch<React.SetStateAction<StatusMessage | null>>;
};

type ChangeData = {
  event: React.FormEvent<HTMLFormElement>;
  form: UseFormReturn<Record<string, unknown>>;
};

type FormProps<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>
> = Omit<React.ComponentProps<"form">, "onSubmit" | "onChange"> & {
  onSubmit: (props: SubmitData<TResult, TVariables>) => void;
  onChange?: (props: ChangeData) => void;
};

export default function FormContainer<
  TResult extends Record<string, unknown> = Record<string, unknown>,
  TVariables extends Record<string, unknown> = Record<string, unknown>
>({
  defaultValues = {},
  onSubmit,
  onChange,
  apiPath,
  mutationFn,
  onSuccess,
  schema,
  ...props
}: FormProviderProps<TResult, TVariables> & FormProps<TResult, TVariables>) {
  // const queryProps = mutationFn
  //   ? {
  //       mutationFn,
  //     }
  //   : { id };

  return (
    <FormProvider<TResult, TVariables>
      mutationFn={mutationFn}
      apiPath={apiPath}
      schema={schema}
      defaultValues={defaultValues}
      onSuccess={onSuccess}
    >
      <Form<TResult, TVariables>
        onSubmit={onSubmit}
        onChange={onChange}
        {...props}
      />
    </FormProvider>
  );
}

export function Form<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>
>({ onSubmit, onChange, ...props }: FormProps<TResult, TVariables>) {
  const { form, mutation, setStatusMessage } = useForm();
  const {
    formState: { isDirty },
  } = form;
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((data, event) =>
        onSubmit
          ? onSubmit({
              data,
              event,
              mutation,
              isDirty,
              form,
              setStatusMessage,
            } as SubmitData<TResult, TVariables>)
          : null
      )}
      onChange={onChange ? (event) => onChange({ event, form }) : undefined}
      {...props}
    />
  );
}
