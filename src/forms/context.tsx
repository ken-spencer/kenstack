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
import {
  useMutation,
  type MutationKey,
  type UseMutationResult,
} from "@tanstack/react-query";
import type * as z from "zod";

import fetcher, {
  type FetchResult,
  type FetchSuccess,
} from "@kenstack/api/fetcher";
import { getReturnedErrorMessage } from "@kenstack/api/errors";
import { accountChangedRefusal } from "@kenstack/auth/renderedAccount";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import {
  refreshUserInfo,
  setLoginDestination,
  setUserInfo,
} from "@kenstack/auth/useUserInfo";
import { formErrorName, moveRootFormError } from "./internal/fieldErrors";
import { SubmitFailureContext } from "@kenstack/forms/internal/submitFailure";
import { isUnloadAllowed, useNavigationBlocker } from "./NavigationBlocker";

import type { NoticeProps } from "@kenstack/components/Notice";
import QueryProvider from "@kenstack/context/QueryProvider";

export type FormSchema = z.ZodType<Record<string, unknown>, FieldValues>;

//eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormContext = createContext<UseFormResult<any, any, any> | null>(null);

export type StatusMessage = {
  status: NonNullable<NoticeProps["status"]>;
  message: React.ReactNode;
  // A server refusal's code, kept so the notice can offer what it asks for.
  code?: string;
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
function hasStatus(value: object): value is {
  status: StatusMessage["status"];
  message?: React.ReactNode;
  code?: unknown;
} {
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
      ? {
          status: message.status,
          message: message.message,
          ...(typeof message.code === "string" && { code: message.code }),
        }
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
  // Lets code outside the form follow its submission with `useIsMutating`.
  mutationKey?: MutationKey;
  // Names the reCAPTCHA action this form protects. Each `apiPath` submission
  // passes it to fetcher, which sends a token under that name; a `mutationFn`
  // passes it to its own fetcher call. The site-wide RecaptchaProvider loads
  // the script.
  recaptchaAction?: string;
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
  mutationKey,
  onError,
  onSuccess,
  recaptchaAction,
  children,
}: FormProviderProps<TResult, TVariables, TSchema>) {
  const { track } = useAuthorization();
  const [statusMessage, setStatusMessageState] = useState<StatusMessage | null>(
    initialStatusMessage ?? null,
  );
  const initialStatusMessageRef = useRef(initialStatusMessage ?? null);
  const setStatusMessage = useCallback<SetStatusMessage>((message) => {
    setStatusMessageState(normalizeStatusMessage(message));
  }, []);
  const setStatusError: SetStatusError = setStatusMessage;
  const [submitFailure, setSubmitFailure] = useState<object | null>(null);
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
    mutationKey,
    // A request refused for stale authorization is held by a surrounding confirmation, which runs it
    // again once the person confirms; the form stays pending, and shows only the final result.
    mutationFn: (variables: TVariables, context) =>
      track(async () => {
        if (mutationFn) {
          return mutationFn(variables, context);
        }

        if (!apiPath) {
          throw Error("apiPath or mutationFn is required to mutate a form");
        }
        return fetcher<TResult>(apiPath, variables, { recaptchaAction });
      }),
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
        // A sign-in that changed elsewhere: the user-info store settles which account the tab now
        // has. A page rendered signed out takes it; one rendered for an account asks to reload.
        if (data.code === accountChangedRefusal.code) {
          void refreshUserInfo();
        }
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
        if (fieldErrors && Object.keys(fieldErrors).length) {
          setSubmitFailure({});
          Object.entries(fieldErrors).forEach(([field, err]) => {
            setFieldError(
              field as Path<z.input<TSchema>>,
              {
                type: "server",
                message: Array.isArray(err) ? err[0] : err,
              },
              { shouldFocus: true },
            );
          });
        }

        setStatusMessage(data);
        return;
      }

      if (data.status === "success") {
        // This tab's own change to the user or session, adopted in the same handler as onSuccess below,
        // so a step's next() lands in the same render.
        if (data.userInfo) {
          const { authState, loginDestination } = data.userInfo;
          if (loginDestination !== undefined) {
            setLoginDestination(authState, loginDestination);
          }
          setUserInfo(authState);
        }
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
      <FormContext.Provider value={context}>
        <SubmitFailureContext value={{ setSubmitFailure, submitFailure }}>
          {children}
        </SubmitFailureContext>
      </FormContext.Provider>
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
      if (isUnloadAllowed()) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [enabled, isDirty]);
}
