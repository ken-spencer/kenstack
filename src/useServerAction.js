// A hook for submitting server actions without a form

import { useMemo, useTransition, useCallback } from "react";

export default function useServerAction(action, initial = null) {
  let [isPending, startTransition] = useTransition();

  const retval = useCallback(
    (...args) => {
      const filteredArgs = args.filter((val) => {
        // we don't want to pass events to a server action
        if (
          typeof val === "object" &&
          val.constructor.name === "SyntheticBaseEvent"
        ) {
          return false;
        }
        return true;
      });

      const promise = new Promise((resolve, fail) => {
        startTransition(async () => {
          let result;
          try {
            result = await action(initial, ...filteredArgs);
            resolve(result);
          } catch (e) {
            fail(e);
          }
        });
      });
      return promise;
    },
    [action, initial],
  );

  return useMemo(() => [isPending, retval], [isPending, retval]);
}
