"use client";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { useMutation } from "@tanstack/react-query";

import Notice from "@kenstack/components/Notice";
import Help from "@kenstack/components/Help";
import { Button } from "@kenstack/components/Button";
import { Mail } from "lucide-react";

import fetcher from "@kenstack/api/fetcher";
import { useForm } from "@kenstack/forms/context";

export default function Onboarding() {
  const { id } = useAdminEdit();
  const { form } = useForm();
  const email = form.watch("email");
  const hasEmail = typeof email === "string" && email.trim().length > 0;
  const isEmailDirty = Boolean(form.formState.dirtyFields.email);
  const mutation = useMutation({
    mutationFn: () =>
      fetcher("/api/auth", { action: "send-onboarding", userId: id }),
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
            return <Notice>{mutation.error.message}</Notice>;
          } else if (data) {
            return <Notice status={data.status}>{data.message}</Notice>;
          }
        })()
      ) : (
        <>
          <Button
            disabled={!hasEmail || isEmailDirty}
            icon={Mail}
            isPending={mutation.isPending}
            onClick={() => mutation.mutate()}
            type="button"
          >
            Send onboarding email
          </Button>
          <Help
            message={
              isEmailDirty
                ? "Save the email address before sending onboarding."
                : hasEmail
                  ? "Send a login link with this email address filled in."
                  : "Add an email address before sending onboarding."
            }
          />
        </>
      )}
    </div>
  );
}
