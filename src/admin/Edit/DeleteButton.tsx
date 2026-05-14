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
} from "@kenstack/components/ui/alert-dialog";

import { Trash, Undo2 } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { useAdminEdit } from "./context";
import fetcher from "@kenstack/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "@kenstack/forms/context";

export default function DeleteButton() {
  const { setStatusMessage } = useForm();
  const router = useRouter();
  const { isNew, id, name, userId, apiPath, listPath, item } = useAdminEdit();
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
      setStatusMessage({
        status: "error",
        message:
          "There was an unexpected problem handling your request. Please try again later.",
      });

      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, idToRemove) => {
      if (data.status === "error") {
        setStatusMessage({
          status: "error",
          message: data.message,
        });
      }

      if ("success" === data.status) {
        queryClient.removeQueries({
          queryKey: ["admin-edit", idToRemove],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["admin-list"],
        });

        router.push(listPath);
      }
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton
          disabled={isNew || (name === "users" && id === userId)}
          isPending={mutation.isPending}
          className="relative"
          tooltip={isDeleted ? "Delete Forever" : "Delete"}
          // disabled={}
        >
          <Trash className="size-6 text-gray-800" />
        </IconButton>
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
  const { isNew, id, name, apiPath, listPath, item } = useAdminEdit();
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
      setStatusMessage({
        status: "error",
        message:
          "There was an unexpected problem handling your request. Please try again later.",
      });

      // eslint-disable-next-line no-console
      console.error(err);
    },
    onSuccess: (data, idToRestore) => {
      if (data.status === "error") {
        setStatusMessage({
          status: "error",
          message: data.message,
        });
      }

      if ("success" === data.status) {
        queryClient.removeQueries({
          queryKey: ["admin-edit", idToRestore],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["admin-list"],
        });

        router.push(listPath);
      }
    },
  });

  if (!isDeleted) {
    return null;
  }

  return (
    <IconButton
      disabled={isNew}
      isPending={mutation.isPending}
      type="button"
      tooltip="Restore"
      onClick={() => {
        if (id) {
          mutation.mutate(id);
        }
      }}
    >
      <Undo2 className="size-6 text-gray-800" />
    </IconButton>
  );
}
