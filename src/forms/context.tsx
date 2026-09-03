import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  FormProvider as ReactHookFormProvider,
  useForm as useReactHookForm,
  type UseFormReturn,
  type DefaultValues,
  type FieldValues,
  type FieldErrors,
  type Path,
} from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type * as z from "zod";

import fetcher, {
  type FetchResult,
  type FetchSuccess,
} from "@kenstack/api/fetcher";
import { getReturnedErrorMessage } from "@kenstack/api/errors";
import { formErrorName, moveRootFormError } from "./internal/fieldErrors";
import { useNavigationBlocker } from "./NavigationBlocker";

import type { NoticeProps } from "@kenstack/components/Notice";
import QueryProvider from "@kenstack/context/QueryProvider";

export type FormSchema = z.ZodType<Record<string, unknown>, FieldValues>;

//eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormContext = createContext<UseFormResult<any, any, any> | null>(null);

export type StatusMessage = {
  status: NonNullable<NoticeProps["status"]>;
  message: React.ReactNode;
};

type StatusMessageInput =
  | StatusMessage
  | FetchResult<Record<string, unknown>>
  | Error
  | string
  | null
  | undefined;

export type SetStatusMessage = (message: StatusMessageInput) => void;
export type SetStatusError = (message: string | null) => void;

const noticeStatuses: readonly string[] = [
  "error",
  "success",
  "information",
] satisfies Array<StatusMessage["status"]>;

// Untyped callers can pass anything; only a notice-shaped object is shown.
function hasStatus(
  value: object,
): value is { status: StatusMessage["status"]; message?: React.ReactNode } {
  return (
    "status" in value &&
    typeof value.status === "string" &&
    noticeStatuses.includes(value.status)
  );
}

function normalizeStatusMessage(
  message: StatusMessageInput,
): StatusMessage | null {
  if (message === null || message === undefined || message === "") {
    return null;
  }
  if (message instanceof Error) {
    // Only a ReturnedError carries a message meant for the visitor.
    const errorMessage = getReturnedErrorMessage(message);
    return errorMessage ? { status: "error", message: errorMessage } : null;
  }
  if (typeof message === "string") {
    return { status: "error", message };
  }
  if (typeof message === "object" && hasStatus(message)) {
    return message.message
      ? { status: message.status, message: message.message }
      : null;
  }

  return null;
}

export type MutationFn<TResult extends Record<string, unknown>, TVariables> = (
  variables: TVariables,
  context: unknown,
) => Promise<FetchResult<TResult>>;

export type FormProviderProps<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
> = {
  /** Also used internally by some fields */
  apiPath?: string;
  mutationFn?: MutationFn<TResult, TVariables>;
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  guardUnsaved?: boolean;
  // Initial status for a form that begins in a known state, such as a page
  // reached from an expired-link redirect.
  initialStatusMessage?: StatusMessage | null;
  onSuccess?: (
    data: FetchSuccess<TResult>,
    variables: TVariables,
    context: {
      form: UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>;
    },
  ) => void;
  onError?: (
    error: Error,
    variables: TVariables,
    context: {
      form: UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>;
      setStatusError: SetStatusError;
      setStatusMessage: SetStatusMessage;
    },
  ) => void;
  children: React.ReactNode;
};

export type UseFormResult<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
  TSubmitValues extends FieldValues = TValues,
> = {
  apiPath?: string;
  form: UseFormReturn<TValues, unknown, TSubmitValues>;
  statusMessage: StatusMessage | null;
  setStatusError: SetStatusError;
  setStatusMessage: SetStatusMessage;
  uploadingFields: Set<string>;
  startUploading: (fieldName: string) => void;
  finishUploading: (fieldName: string) => void;
  mutation: UseMutationResult<FetchResult<TResult>, Error, TVariables>;
};

export function FormProvider<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
>(props: FormProviderProps<TResult, TVariables, TSchema>) {
  return (
    <QueryProvider>
      <FormContextProvider {...props} />
    </QueryProvider>
  );
}

function FormContextProvider<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TSchema extends FormSchema,
>({
  apiPath,
  defaultValues,
  guardUnsaved = false,
  initialStatusMessage,
  schema,
  mutationFn,
  onError,
  onSuccess,
  children,
}: FormProviderProps<TResult, TVariables, TSchema>) {
  const [statusMessage, setStatusMessageState] = useState<StatusMessage | null>(
    initialStatusMessage ?? null,
  );
  const initialStatusMessageRef = useRef(initialStatusMessage ?? null);
  const setStatusMessage = useCallback<SetStatusMessage>((message) => {
    setStatusMessageState(normalizeStatusMessage(message));
  }, []);
  const setStatusError: SetStatusError = setStatusMessage;
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(
    () => new Set(),
  );
  const startUploading = useCallback((fieldName: string) => {
    setUploadingFields((current) => {
      const next = new Set(current);
      next.add(fieldName);
      return next;
    });
  }, []);

  const finishUploading = useCallback((fieldName: string) => {
    setUploadingFields((current) => {
      const next = new Set(current);
      next.delete(fieldName);
      return next;
    });
  }, []);

  const schemaResolver = standardSchemaResolver(schema);
  const form = useReactHookForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: async (...arguments_) => {
      const result = await schemaResolver(...arguments_);
      if (!result.errors.root) {
        return result;
      }

      return {
        values: {},
        errors: moveRootFormError(result.errors) as FieldErrors<
          z.input<TSchema>
        >,
      };
    },
    defaultValues,
    criteriaMode: "all",
    mode: "onBlur", // validate fields on blur
    shouldFocusError: true,
  });

  const { resetField, setError: setFieldError, clearErrors } = form;
  useUnsavedGuard(guardUnsaved, form.formState.isDirty);

  useLayoutEffect(
    () => () => {
      // Activity preserves the form draft. Clear only transient form state
      // when its route or owning surface is hidden. The upload guard stays:
      // each upload field settles its own entry when its upload ends.
      setStatusMessage(initialStatusMessageRef.current);
    },
    [setStatusMessage],
  );

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
    onError: (err, variables) => {
      if (err?.name === "AbortError") {
        return;
      }
      setStatusError(getReturnedErrorMessage(err));

      //eslint-disable-next-line no-console
      console.error(
        err instanceof Error && err.cause instanceof Error ? err.cause : err,
      );
      onError?.(err, variables, { form, setStatusError, setStatusMessage });
    },
    onSuccess: (data, variables) => {
      if (data.status === "error") {
        const { fieldErrors, formErrors = [] } = data;
        if (fieldErrors || formErrors.length) {
          clearErrors();
          formErrors.forEach((message, index) => {
            setFieldError(
              `${formErrorName}.server.${index}` as Path<z.input<TSchema>>,
              { type: "server", message },
              { shouldFocus: false },
            );
          });
        }
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, err]) => {
            const messages = Array.isArray(err) ? err : [err];
            setFieldError(
              field as Path<z.input<TSchema>>,
              {
                type: "server",
                message: messages[0],
                ...(messages.length > 1
                  ? {
                      types: Object.fromEntries(
                        messages.map((message, index) => [
                          `server.${index}`,
                          message,
                        ]),
                      ),
                    }
                  : {}),
              },
              { shouldFocus: true },
            );
          });
        }

        setStatusMessage(data);
        return;
      }

      if (data.status === "success") {
        if (data.values) {
          // this will only update fields that are rendered
          Object.entries(data.values).forEach(([fieldName, value]) => {
            resetField(fieldName as Path<z.input<TSchema>>, {
              defaultValue: value,
              keepError: false,
              keepDirty: false,
              keepTouched: false,
            });
          });
        }

        setStatusMessage(data);
        onSuccess?.(data, variables, { form });
      }
    },
  });

  const context: UseFormResult<
    TResult,
    TVariables,
    z.input<TSchema>,
    z.output<TSchema>
  > = {
    apiPath,
    form,
    statusMessage,
    setStatusError,
    setStatusMessage,
    uploadingFields,
    startUploading,
    finishUploading,
    mutation,
  };

  return (
    <ReactHookFormProvider {...form}>
      <FormContext.Provider value={context}>{children}</FormContext.Provider>
    </ReactHookFormProvider>
  );
}

function useForm<
  TResult extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
  TValues extends FieldValues,
  TSubmitValues extends FieldValues = TValues,
>() {
  const ctx = useOptionalForm();
  if (!ctx) {
    throw new Error("useForm must be used within FormProvider");
  }
  return ctx as UseFormResult<TResult, TVariables, TValues, TSubmitValues>;
}

function useOptionalForm() {
  return useContext(FormContext);
}

export { useForm, useOptionalForm };

// Synchronizes form dirtiness with guarded links and full-document exit warnings.
function useUnsavedGuard(enabled: boolean, isDirty: boolean) {
  const { setBlocked } = useNavigationBlocker();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setBlocked(isDirty);

    return () => {
      setBlocked(false);
    };
  }, [enabled, isDirty, setBlocked]);

  useEffect(() => {
    if (!enabled || !isDirty) {
      return;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [enabled, isDirty]);
}
