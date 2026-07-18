"use client";
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
import { useAdminEdit } from "../context";
import fetcher from "@kenstack/api/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "@kenstack/forms/context";

function useRemoveMutation(mode: "trash" | "permanent" | "restore") {
  const { setStatusMessage } = useForm();
  const router = useRouter();
  const { name, apiPath, listPath } = useAdminEdit();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idToRemove: number) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode,
        remove: [idToRemove],
      }),
    onError: (err) => {
      setStatusMessage(err);

      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, idToRemove) => {
      if (data.status === "error") {
        setStatusMessage(data);
      }

      if ("success" === data.status) {
        queryClient.removeQueries({
          queryKey: ["admin-edit", name, idToRemove],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["admin-list"],
        });

        router.push(listPath);
      }
    },
  });
}

export default function DeleteButton() {
  const { isNew, id, name, userId, single, item } = useAdminEdit();
  const isDeleted = !!item?.deletedAt;
  const mutation = useRemoveMutation(isDeleted ? "permanent" : "trash");

  if (single) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={isNew || (name === "users" && id === userId)}
          isPending={mutation.isPending}
          className="relative"
          size="icon"
          tooltip={isDeleted ? "Delete Forever" : "Delete"}
          variant="ghost"
        >
          <Trash className="text-foreground size-6" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {isDeleted
              ? "This will permanently delete this record. This cannot be undone."
              : "This will move this record to the trash."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (id) {
                mutation.mutate(id);
              }
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
  const { isNew, id, single, item } = useAdminEdit();
  const isDeleted = !!item?.deletedAt;
  const mutation = useRemoveMutation("restore");

  if (single || !isDeleted) {
    return null;
  }

  return (
    <Button
      disabled={isNew}
      isPending={mutation.isPending}
      size="icon"
      type="button"
      tooltip="Restore"
      variant="ghost"
      onClick={() => {
        if (id) {
          mutation.mutate(id);
        }
      }}
    >
      <Undo2 className="text-foreground size-6" />
    </Button>
  );
}
