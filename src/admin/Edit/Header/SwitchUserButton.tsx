"use client";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import fetcher from "@kenstack/api/fetcher";
import Button from "@kenstack/components/Button";
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
    <Button
      disabled={isCurrentUser}
      isPending={isPending}
      size="icon"
      type="button"
      tooltip={isCurrentUser ? "You are already this user" : "Switch to user"}
      variant="ghost"
      onClick={() => mutate(id)}
    >
      <UserRoundKey className="size-6 text-gray-800" />
    </Button>
  );
}
