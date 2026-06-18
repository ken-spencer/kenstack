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

export default function DeleteButton() {
  const { setStatusMessage } = useForm();
  const router = useRouter();
  const { isNew, id, name, userId, apiPath, listPath, single, item } =
    useAdminEdit();
  const queryClient = useQueryClient();
  const isDeleted = !!item?.deletedAt;
  const mutation = useMutation({
    mutationFn: async (idToRemove: number) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode: isDeleted ? "permanent" : "trash",
        remove: [idToRemove],
      }),
    onMutate: async () => {},
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
          <Trash className="size-6 text-gray-800" />
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
  const { setStatusMessage } = useForm();
  const router = useRouter();
  const { isNew, id, name, apiPath, listPath, single, item } = useAdminEdit();
  const queryClient = useQueryClient();
  const isDeleted = !!item?.deletedAt;
  const mutation = useMutation({
    mutationFn: async (idToRestore: number) =>
      fetcher(apiPath, {
        name,
        action: "remove",
        mode: "restore",
        remove: [idToRestore],
      }),
    onError: (err) => {
      setStatusMessage(err);

      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, idToRestore) => {
      if (data.status === "error") {
        setStatusMessage(data);
      }

      if ("success" === data.status) {
        queryClient.removeQueries({
          queryKey: ["admin-edit", name, idToRestore],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["admin-list"],
        });

        router.push(listPath);
      }
    },
  });

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
      <Undo2 className="size-6 text-gray-800" />
    </Button>
  );
}
