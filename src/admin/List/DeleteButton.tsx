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
} from "@kenstack/components/AlertDialog";

import { Trash, Undo2 } from "lucide-react";
import Button from "@kenstack/components/Button";
import { Badge } from "@kenstack/components/Badge";
import { type AdminListQueryData, useAdminList } from "./context";
import fetcher from "@kenstack/api/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useRemoveMutation(mode: "trash" | "permanent" | "restore") {
  const { name, setSelected, apiPath, queryKey } = useAdminList();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: number[]) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode,
        remove: variables,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<AdminListQueryData>(queryKey);

      if (previous && "items" in previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          items: previous.items?.filter((item) => !variables.includes(item.id)),
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
}

function SelectionCountBadge({ count }: { count: number }) {
  return (
    <Badge
      className={
        "pointer-events-none absolute -top-2 -right-2 flex h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-center text-[10px] transition-opacity duration-200 " +
        (count ? "pointer-events-auto opacity-80" : "opacity-0")
      }
    >
      {count}
    </Badge>
  );
}

export default function DeleteButton() {
  const { selected, filters, isReorderSort } = useAdminList();
  const inTrash = filters.trash;
  const mutation = useRemoveMutation(inTrash ? "permanent" : "trash");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          isPending={mutation.isPending}
          className="relative"
          size="icon"
          tooltip={inTrash ? "Delete Forever" : "Delete"}
          disabled={!selected.length || isReorderSort}
          variant="ghost"
        >
          <SelectionCountBadge count={selected.length} />
          <Trash className="text-foreground size-6" />
        </Button>
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
  const { selected, filters, isReorderSort } = useAdminList();
  const inTrash = filters.trash;
  const mutation = useRemoveMutation("restore");

  if (!inTrash) {
    return null;
  }

  return (
    <Button
      type="button"
      isPending={mutation.isPending}
      className="relative"
      size="icon"
      tooltip="Restore"
      disabled={!selected.length || isReorderSort}
      variant="ghost"
      onClick={() => mutation.mutate(selected)}
    >
      <SelectionCountBadge count={selected.length} />
      <Undo2 className="text-foreground size-6" />
    </Button>
  );
}
