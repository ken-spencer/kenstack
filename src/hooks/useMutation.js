/**
 * Let's reduce some of the boiler plate from react query
 **/

import {
  useMutation as useRQMutation,
  useQueryClient,
} from "@tanstack/react-query";

export default function useMutation({
  mutationFn,
  queryKey,
  successKey,
  onMutate = null,
  onError = null,
  onSuccess = null,
  onSettled = null,
  store, // work with the zustand store,
  ...rest
}) {
  const queryClient = useQueryClient();

  const mutation = useRQMutation({
    mutationFn,
    onMutate: async (post) => {
      if (store) {
        store.setState({ pending: true });
      }

      if (!queryKey) {
        if (onMutate) {
          await onMutate(post, {
            queryClient,
            state: store ? store.getState() : null,
          });
        }
        return;
      }
      await queryClient.cancelQueries({ queryKey });
      let previous = {};
      const set = (setter) => {
        previous.value = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, setter);
      };

      let context;
      if (onMutate) {
        try {
          context = await onMutate(post, {
            set,
            previous: queryKey ? queryClient.getQueryData(queryKey) : null,
            queryClient,
            state: store ? store.getState() : null,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      if (context === undefined) {
        return { previous: previous.value };
      }
      if (typeof context === "object") {
        return { previous: previous.value, ...context };
      } else {
        return context;
      }
    },
    onSuccess: (data, variables, context) => {
      // apply success side effects
      if (onSuccess && data?.success) {
        try {
          onSuccess({
            data,
            variables,
            context,
            queryClient,
            state: store ? store.getState() : null,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
      if (typeof data.success === "string" && store) {
        store.getState().addMessage(data);
      }

      if (data?.success && (queryKey || successKey)) {
        // refetch data on success
        queryClient.invalidateQueries({ queryKey: successKey ?? queryKey });
      } else if (data?.error && queryKey && context.previous) {
        // revert optimistic changes
        queryClient.setQueryData(queryKey, context.previous);
      }

      if (data?.error && store) {
        store.getState().addMessage(data);
        if (data.fieldErrors) {
          store.getState().setFieldErrors(data.fieldErrors);
        }
      }

      if (data?.error && onError) {
        try {
          onError({
            error: new Error(data.error),
            variables,
            context,
            queryClient,
            state: store ? store.getState() : null,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    },
    onError: (error, variables, context) => {
      // eslint-disable-next-line no-console
      console.error(error);

      if (onError) {
        try {
          onError({
            error,
            variables,
            context,
            queryClient,
            state: store ? store.getState() : null,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      // revert optimistic changes
      if (queryKey && context.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (store) {
        store.setState({ pending: false });
      }

      if (onSettled) {
        try {
          onSettled({
            data,
            error,
            variables,
            context,
            state: store ? store.getState() : null,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    },
    ...rest,
  });

  return mutation;
}
