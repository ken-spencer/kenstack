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
  ...rest
}) {
  const queryClient = useQueryClient();

  const mutation = useRQMutation({
    mutationFn,
    onMutate: queryKey
      ? async (post) => {
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
        }
      : onMutate,
    onSuccess: (data, variables, context) => {
      // apply success side effects
      if (onSuccess && data?.success) {
        try {
          onSuccess({ data, variables, context });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      if (data?.success && (queryKey || successKey)) {
        if (data?.success) {
          // refetch data on success
          queryClient.invalidateQueries({ queryKey: successKey ?? queryKey });
        } else if (data?.error && context.previous) {
          // revert optimistic changes
          queryClient.setQueryData(queryKey, context.previous);
        }
      }
    },
    onError: (error, variables, context) => {
      // eslint-disable-next-line no-console
      console.error(error);

      if (onError) {
        try {
          onError({ error, variables, context });
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
      if (onSettled) {
        try {
          onSettled({ data, error, variables, context });
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
