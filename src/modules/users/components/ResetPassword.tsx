"use client";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { useMutation } from "@tanstack/react-query";

import Alert from "@kenstack/components/Alert";
import Help from "@kenstack/components/Help";
import { Button } from "@kenstack/components/ui/button";
import { LoaderCircle, RotateCcwKey } from "lucide-react";

import fetcher from "@kenstack/api/fetcher";

export default function ResetPassword() {
  const { id } = useAdminEdit();
  const mutation = useMutation({
    mutationFn: () =>
      fetcher("/api/auth", { _action: "send-password-reset", userId: id }),
  });

  if (!id) {
    return null;
  }
  const { data } = mutation;

  return (
    <div className="flex items-center justify-center gap-1 sm:justify-start">
      {mutation.isSuccess || mutation.isError ? (
        (() => {
          if (mutation.error) {
            return <Alert>{mutation.error.message}</Alert>;
          } else if (data) {
            return <Alert status={data.status}>{data.message}</Alert>;
          }
        })()
      ) : (
        <>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <RotateCcwKey data-icon="inline-start" />
            )}
            Reset Password
          </Button>
          <Help message="Click the button to send a password reset email to the user." />
        </>
      )}
    </div>
  );
}
