"use client";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import fetcher from "@kenstack/api/fetcher";
import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRoundKey } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SwitchUserButton() {
  const { id, userId, apiPath, name } = useAdminEdit();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setStatusMessage } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: (targetUserId: number) => {
      setStatusMessage(null);
      router.prefetch("/");
      return fetcher(apiPath, {
        action: "impersonate",
        name,
        userId: targetUserId,
      });
    },
    onSuccess: (res) => {
      if (res.status === "error") {
        setStatusMessage(res);
      } else {
        queryClient.invalidateQueries({ queryKey: ["user-info"] });
        router.push("/");
      }
    },
    onError: (err) => {
      setStatusMessage(err);

      // eslint-disable-next-line no-console
      console.error(err);
    },
  });

  if (name !== "users" || !id) {
    return null;
  }

  const isCurrentUser = id === userId;

  return (
    <IconButton
      disabled={isCurrentUser}
      isPending={isPending}
      type="button"
      tooltip={isCurrentUser ? "You are already this user" : "Switch to user"}
      onClick={() => mutate(id)}
    >
      <UserRoundKey className="size-6 text-gray-800" />
    </IconButton>
  );
}
