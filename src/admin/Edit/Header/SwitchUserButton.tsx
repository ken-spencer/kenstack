"use client";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { getReturnedErrorMessage } from "@kenstack/api/errors";
import fetcher from "@kenstack/api/fetcher";
import Button from "@kenstack/components/Button";
import { useForm } from "@kenstack/forms/context";
import type { UserInfoResult } from "@kenstack/auth/api";
import { setUserInfo } from "@kenstack/auth/useUserInfo";
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
      return fetcher<{ userInfo: UserInfoResult }>(apiPath, {
        action: "impersonate",
        name,
        userId: targetUserId,
      });
    },
    onSuccess: (res) => {
      if (res.status === "error") {
        setStatusMessage(res);
      } else {
        // This tab's own switch, adopted as a sign-in, then left the way logout leaves.
        setUserInfo(res.userInfo.authState);
        router.push("/");
        router.refresh();
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
