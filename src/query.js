/**
 * Let's reduce some of the boiler plate from react query
 **/

import {
  useMutation as useRQMutation,
  useQueryClient,
} from "@tanstack/react-query";

export function useMutation(
  queryKey,
  mutationFn,
  { onMutate = null, onError = null, onSuccess = null, onSettled = null },
) {
  const queryClient = useQueryClient();
  const set = (setter) => queryClient.setQueryData(queryKey, setter);

  const mutation = useRQMutation({
    mutationFn,
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      if (onMutate) {
        try {
          return await onMutate(post, { set, previous });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }

      return { previous };
    },
    onSuccess: (data, variables, context) => {
      const refetch = () => queryClient.invalidateQueries({ queryKey });
      if (onSuccess) {
        try {
          onSuccess({ data, variables, context, refetch });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      } else {
        refetch();
      }
    },
    onError: (error, variables, context) => {
      // eslint-disable-next-line no-console
      console.error(error);

      const revert = () => queryClient.setQueryData(queryKey, context.previous);
      if (onError) {
        try {
          onError({ error, variables, context, revert, set });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    },
    onSettled: (data, error, variables, context) => {
      const refetch = () => queryClient.invalidateQueries({ queryKey });
      if (onSettled) {
        onSettled({ data, error, variables, context, refetch });
      }
    },
  });

  return mutation;
}
