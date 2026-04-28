"use client";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { useMutation } from "@tanstack/react-query";

import Button from "@kenstack/components/Button";
import Alert from "@kenstack/components/Alert";

import fetcher from "@kenstack/lib/fetcher";

export default function ResetPassword() {
  const { id } = useAdminEdit();
  const mutation = useMutation({
    mutationFn: () => fetcher("/forgotten-password/api", { userId: id }),
  });

  if (!id) {
    return null;
  }
  const { data } = mutation;

  return (
    <div>
      <div>Password reset</div>
      <div>
        Click the button below to send a password reset email to the user.{" "}
      </div>
      <div className="my-4">
        {mutation.isSuccess || mutation.isError ? (
          (() => {
            if (mutation.error) {
              return <Alert>{mutation.error.message}</Alert>;
            } else if (data) {
              return <Alert status={data.status}>{data.message}</Alert>;
            }
          })()
        ) : (
          <Button
            type="button"
            isPending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Send email
          </Button>
        )}
      </div>
    </div>
  );
}
