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

import { Trash, Undo2 } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { Badge } from "@kenstack/components/ui/badge";
import { type AdminListQueryData, useAdminList } from "./context";
import fetcher from "@kenstack/api/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DeleteButton() {
  const { name, selected, setSelected, apiPath, queryKey, filters } =
    useAdminList();
  const queryClient = useQueryClient();
  const inTrash = filters.trash;
  const mutation = useMutation({
    mutationFn: async (variables: number[]) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode: inTrash ? "permanent" : "trash",
        remove: variables,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<AdminListQueryData>(queryKey);

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
          isPending={mutation.isPending}
          className="relative"
          tooltip={inTrash ? "Delete Forever" : "Delete"}
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
            {inTrash
              ? `This will permanently delete ${selected.length} record${selected.length > 1 ? "s" : ""}. This cannot be undone.`
              : `This will move ${selected.length} record${selected.length > 1 ? "s" : ""} to the trash.`}
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

export function RestoreButton() {
  const { name, selected, setSelected, apiPath, queryKey, filters } =
    useAdminList();
  const queryClient = useQueryClient();
  const inTrash = filters.trash;
  const mutation = useMutation({
    mutationFn: async (variables: number[]) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode: "restore",
        remove: variables,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<AdminListQueryData>(queryKey);

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

  if (!inTrash) {
    return null;
  }

  return (
    <IconButton
      type="button"
      isPending={mutation.isPending}
      className="relative"
      tooltip="Restore"
      disabled={!selected.length}
      onClick={() => mutation.mutate(selected)}
    >
      <Badge
        className={
          "pointer-events-none absolute -top-2 -right-2 flex h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-center text-[10px] transition-opacity duration-200 " +
          (selected.length ? "pointer-events-auto opacity-80" : "opacity-0")
        }
      >
        {selected.length}
      </Badge>
      <Undo2 className="size-6 text-gray-800" />
    </IconButton>
  );
}
