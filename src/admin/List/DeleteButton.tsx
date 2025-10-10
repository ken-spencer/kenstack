import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@kenstack/components/ui/alert-dialog";

import { Trash } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { Badge } from "@kenstack/components/ui/badge";
import { useAdminList } from "./context";
import fetcher, { type FetchResult } from "@kenstack/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminListResult } from "@kenstack/admin/types";

export default function DeleteButton() {
  const { selected, setSelected, apiPath, queryKey } = useAdminList();
  const queryClient = useQueryClient();
  const mutation = useMutation<
    FetchResult,
    Error,
    string[],
    { previous: unknown }
  >({
    mutationFn: async (variables) =>
      fetcher(apiPath + "/remove", { remove: variables }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<AdminListResult>(queryKey);

      if (previous && "items" in previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          items: previous.items?.filter((item) => !selected.includes(item.id)),
        });
      }
      setSelected([]);

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, _v, context) => {
      if (data.status === "error" && context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      if ("success" === data.status) {
        queryClient.invalidateQueries({
          queryKey: ["admin-list"],
        });
      }
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton
          isPending={mutation.isPaused}
          className="relative"
          tooltip="Delete"
          disabled={!selected.length}
        >
          <Badge
            className={
              "pointer-events-none absolute -top-2 -right-2 flex h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-center text-[10px] transition-opacity duration-200 " +
              (selected.length ? "pointer-events-auto opacity-80" : "opacity-0")
            }
          >
            {selected.length}
          </Badge>
          <Trash className="size-6 text-gray-800" />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete {selected.length} record
            {selected.length > 1 ? "s" : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              mutation.mutate(selected);
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
