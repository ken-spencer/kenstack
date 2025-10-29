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
import { useAdminEdit } from "./context";
import fetcher from "@kenstack/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "@kenstack/forms/context";

export default function DeleteButton() {
  const { setStatusMessage } = useForm();
  const router = useRouter();
  const { isNew, id, apiPath, listPath } = useAdminEdit();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (idToRemove: string) =>
      fetcher(apiPath + "/remove", { remove: [idToRemove] }),
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
          disabled={isNew}
          isPending={mutation.isPending}
          className="relative"
          tooltip="Delete"
          // disabled={}
        >
          <Trash className="size-6 text-gray-800" />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete this record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              mutation.mutate(id);
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
