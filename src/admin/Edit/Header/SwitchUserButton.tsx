"use client";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { getReturnedErrorMessage } from "@kenstack/api/errors";
import fetcher from "@kenstack/api/fetcher";
import Button from "@kenstack/components/Button";
import { useForm } from "@kenstack/forms/context";
import { refreshUserInfo } from "@kenstack/auth/useUserInfo";
import { useMutation } from "@tanstack/react-query";
import { UserRoundKey } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SwitchUserButton() {
  const { id, userId, apiPath, name } = useAdminEdit();
  const router = useRouter();
  const { setStatusError, setStatusMessage } = useForm();

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
        void refreshUserInfo();
        router.push("/");
      }
    },
    onError: (err) => {
      setStatusError(getReturnedErrorMessage(err));

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
      <UserRoundKey className="text-foreground size-6" />
    </Button>
  );
}
