import type * as z from "zod";

import React, { useRef, createContext, useContext, useState } from "react";
// import { nanoid } from "nanoid";
import {
  useForm as useReactHookForm,
  type UseFormReturn,
  type DefaultValues,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Form as ReactHookFormProvider } from "@kenstack/components/ui/form";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  useMutation,
  // type MutationFunction,
  type UseMutationResult,
} from "@tanstack/react-query";
import fetcher, { type FetchResult } from "@kenstack/lib/fetcher";

export type FormSchema = z.ZodType<Record<string, unknown>, FieldValues>;

//eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormContext = createContext<UseFormResult<any, any, any> | null>(null);

import { FetchSuccess } from "@kenstack/lib/fetcher";

export type StatusMessage = {
  status: "error" | "success";
  message: React.ReactNode;
};

// export type WithExtra<TResult> = TResult & { values: Record<string, unknown> };

export type MutationFn<TResult extends Record<string, unknown>, TVariables> = (
  variables: TVariables,
  context: unknown
) => Promise<FetchResult<TResult>>;

export type FormProviderProps<
  TResult extends Record<string, unknown>, // = Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
  TValues extends FieldValues = z.input<TSchema>,
> = {
  /** Also used internally by some fields */
  apiPath?: string;
  mutationFn?: MutationFn<TResult, TVariables>;
  schema: TSchema;
  defaultValues: DefaultValues<TValues>;
  onSuccess?: (
    data: FetchSuccess<TResult>,
    variables: TVariables,
    context: { form: UseFormReturn<TValues> }
  ) => void;
  children: React.ReactNode;
};

export type UseFormResult<
  TResult extends Record<string, unknown>, // = Record<string, unknown>,
  TVariables extends Record<string, unknown>, // = Record<string, unknown>,
  TValues extends FieldValues,
> = {
  apiPath?: string;
  form: UseFormReturn<TValues>;
  statusMessage: StatusMessage | null;
  setStatusMessage: React.Dispatch<React.SetStateAction<StatusMessage | null>>;
  mutation: UseMutationResult<
    // FetchResult<WithExtra<TResult>>,
    FetchResult<TResult>,
    Error,
    TVariables
  >;
};

function FormProvider<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>, // = Record<string, unknown>,
  TSchema extends FormSchema,
  TValues extends FieldValues = z.input<TSchema>,
>({
  apiPath,
  defaultValues,
  // schema: schemaInitial,
  schema,
  mutationFn,
  onSuccess,
  children,
}: FormProviderProps<TResult, TVariables, TSchema, TValues>) {
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null
  );
  const lastFieldRef = useRef(null);

  const form = useReactHookForm<TValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
    mode: "onBlur", // validate fields on blur
    shouldFocusError: true,
  });

  const { resetField, setError, clearErrors } = form;

  // const mutation = useMutation<
  //   FetchResult<WithExtra<TResult>>,
  //   Error,
  //   TVariables
  // >({
  const mutation = useMutation({
    mutationFn: async (variables: TVariables, context) => {
      if (mutationFn) {
        return await mutationFn(variables, context);
      }

      if (!apiPath) {
        throw Error("apiPath or mutationFn is required to mutate a form");
      }
      return fetcher<TResult>(apiPath, variables);
    },
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
        const extraErrors: React.ReactNode[] = [];
        const { fieldErrors /*, formErrors*/ } = data;
        if (fieldErrors) {
          clearErrors();
          Object.entries(fieldErrors).forEach(([field, err], index) => {
            setError(
              field as Path<TValues>,
              { type: "server", message: Array.isArray(err) ? err[0] : err },
              {
                shouldFocus: true,
                // shouldFocus: (variables as CommitVariables)?.commit
                //   ? false
                //   : true,
              }
            );
            if (!form.control._fields[field]) {
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
            resetField(fieldName as Path<TValues>, {
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
          onSuccess(data, variables, { form });
        }
      }
    },
    onSettled: () => {
      lastFieldRef.current = null;
    },
  });

  const values: UseFormResult<TResult, TVariables, TValues> = {
    apiPath,
    form,
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

function useForm<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
>() {
  //}: UseFormResult {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useForm must be used within FormProvider");
  return ctx as UseFormResult<TResult, TVariables, TValues>;
}

export { FormProvider, useForm };
