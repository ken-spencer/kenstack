import React, { useRef, createContext, useContext, useState } from "react";
// import { nanoid } from "nanoid";
import { useForm as useReactHookForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Form as ReactHookFormProvider } from "@kenstack/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  type MutationFunction,
  type UseMutationResult,
} from "@tanstack/react-query";
import fetcher, { type FetchResult } from "@kenstack/lib/fetcher";

const FormContext = createContext<UseFormResult | null>(null);
import type * as z from "zod";

import { FetchSuccess } from "@kenstack/lib/fetcher";

export type StatusMessage = {
  status: "error" | "success";
  message: React.ReactNode;
};

export type WithExtra<TResult> = TResult & { values: Record<string, unknown> };

export type MutationFn<
  TResult extends Record<string, unknown>,
  TVariables,
> = MutationFunction<FetchResult<WithExtra<TResult>>, TVariables>;

import { type SchemaFactory } from "@kenstack/schemas";

export type FormProviderProps<
  TResult extends Record<string, unknown> = Record<string, unknown>,
  TVariables = Record<string, unknown>,
> = {
  /** Also used internally by some fields */
  apiPath?: string;
  mutationFn?: MutationFn<TResult, TVariables>;
  schema: z.ZodType<Record<string, unknown>> | SchemaFactory;
  defaultValues: Record<string, unknown>;
  onSuccess?: (
    data: FetchSuccess<TResult>,
    variables: TVariables,
    context: { form: UseFormReturn }
  ) => void;
  children: React.ReactNode;
};

export type UseFormResult<
  TResult extends Record<string, unknown> = Record<string, unknown>,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
> = {
  apiPath?: string;
  form: UseFormReturn<Record<string, unknown>>;
  renderedFields: Set<string>;
  statusMessage: StatusMessage | null;
  setStatusMessage: React.Dispatch<React.SetStateAction<StatusMessage | null>>;
  mutation: UseMutationResult<
    FetchResult<WithExtra<TResult>>,
    Error,
    TVariables
  >;
};

function FormProvider<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>({
  apiPath,
  defaultValues,
  schema: schemaInitial,
  mutationFn,
  onSuccess,
  children,
}: FormProviderProps<TResult, TVariables>) {
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const counterRef = useRef(0);
  const lastFieldRef = useRef(null);

  /** Build schema from factory function when needed */
  const schema =
    typeof schemaInitial === "function"
      ? schemaInitial("client")
      : schemaInitial;

  const form = useReactHookForm({
    resolver: zodResolver(schema as z.ZodObject),
    defaultValues,
    mode: "onBlur", // validate fields on blur
    shouldFocusError: true,
  });
  const renderedFields = new Set<string>();

  const { resetField, setError, clearErrors } = form;

  const mutation = useMutation<
    FetchResult<WithExtra<TResult>>,
    Error,
    TVariables
  >({
    mutationFn:
      mutationFn ??
      (async (variables) => {
        counterRef.current++;
        return fetcher(apiPath, variables);
      }),
    onMutate: () => {
      setStatusMessage(null);
    },
    onError: (err) => {
      if (err?.name === "AbortError") {
        return;
      }
      setStatusMessage({
        status: "error",
        message:
          "There was an unexpected problem handling your request. Please try again later.",
      });

      //eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, variables) => {
      if ("error" === data.status) {
        const extraErrors = [];
        const { fieldErrors /*, formErrors*/ } = data;
        if (fieldErrors) {
          clearErrors();
          Object.entries(fieldErrors).forEach(([field, err], index) => {
            setError(
              field,
              { type: "server", message: Array.isArray(err) ? err[0] : err },
              {
                shouldFocus: true,
                // shouldFocus: (variables as CommitVariables)?.commit
                //   ? false
                //   : true,
              }
            );
            if (renderedFields.has(field) === false) {
              extraErrors.push(
                <li
                  key={index}
                >{`Error on field ${field}: ${err}. Please contact us if you are unable to proceed.`}</li>
              );
            }
          });
        }

        if (typeof data.message === "string") {
          setStatusMessage({
            status: "error",
            message: (
              <div>
                <div>{data.message}</div>
                {!!extraErrors.length && <ul>{extraErrors}</ul>}
              </div>
            ),
          });
        }

        // if (formErrors.length) {
        //   setError('_form', { type: 'server', message: formErrors[0] })
        // }
        return;
      }

      if ("success" === data.status) {
        if (data.values) {
          // this will only update fields that are rendered
          Object.entries(data.values).forEach(([fieldName, value]) => {
            resetField(fieldName, {
              defaultValue: value,
              keepError: false,
              keepDirty: false,
              keepTouched: false,
            });
          });
        }

        if (data.message) {
          setStatusMessage({
            status: "success",
            message: data.message,
          });
        }
        if (onSuccess) {
          //  && !("commit" in (variables as CommitVariables))) {
          onSuccess(data, variables as TVariables, { form });
        }
      }
    },
    onSettled: () => {
      lastFieldRef.current = null;
    },
  });

  const values = {
    apiPath,
    form,
    renderedFields,
    statusMessage,
    setStatusMessage,
    mutation,
  };

  return (
    <ReactHookFormProvider {...form}>
      <FormContext.Provider value={values}>{children}</FormContext.Provider>
    </ReactHookFormProvider>
  );
}

function useForm(): UseFormResult {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useForm must be used within FormProvider");
  return ctx;
}

export { FormProvider, useForm };
