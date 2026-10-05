"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import fetcher from "@kenstack/api/fetcher";
import Button from "@kenstack/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kenstack/components/Dialog";
import Form from "@kenstack/forms/Form";
import Submit from "@kenstack/forms/Submit";
import QueryProvider from "@kenstack/context/QueryProvider";
import type { SettingsClient } from "@kenstack/admin/client";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";

type ModuleSettingsModalProps = {
  client: SettingsClient;
  description?: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
};

type SettingsLoadResult = {
  values: Record<string, unknown>;
  // The row and token, sent back with each save. Null before the first save.
  id: number | null;
  updatedAt: string | null;
};

export default function ModuleSettingsModal({
  client,
  description,
  name,
  open,
  onOpenChange,
  title,
}: ModuleSettingsModalProps) {
  return (
    <QueryProvider>
      <ModuleSettingsModalContent
        client={client}
        description={description}
        name={name}
        open={open}
        onOpenChange={onOpenChange}
        title={title}
      />
    </QueryProvider>
  );
}

function ModuleSettingsModalContent({
  client,
  description,
  name,
  open,
  onOpenChange,
  title,
}: ModuleSettingsModalProps) {
  const queryClient = useQueryClient();
  const queryKey = ["module-settings", name] as const;
  const query = useQuery({
    queryKey,
    enabled: open,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const result = await fetcher<SettingsLoadResult>("/api/admin", {
        action: "load-module-settings",
        name,
      });

      if (result.status === "error") {
        throw new Error(result.message || "Unable to load module settings.");
      }

      const { id, updatedAt, values } = result;
      return { id, updatedAt, values };
    },
  });
  const defaultValues = useMemo(
    () => query.data?.values ?? createDefaultValues(client.fields),
    [client.fields, query.data],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {query.isError ? (
          <div className="space-y-4">
            <div className="text-destructive text-sm">
              {query.error instanceof Error
                ? query.error.message
                : "Unable to load module settings."}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <Form
            key={query.dataUpdatedAt}
            className="space-y-4"
            schema={client.schema}
            defaultValues={defaultValues}
            mutationFn={async (variables) =>
              fetcher<SettingsLoadResult>("/api/admin", {
                action: "save-module-settings",
                name,
                id: query.data?.id ?? null,
                updatedAt: query.data?.updatedAt ?? null,
                ...variables,
              })
            }
            onSubmit={({ data, mutation, changes }) => {
              return mutation.mutateAsync({ changes, values: data });
            }}
            onSuccess={({ id, updatedAt, values }) => {
              // A save returns the fields it wrote, or the whole record when it merged someone
              // else's changes.
              queryClient.setQueryData(queryKey, {
                id,
                updatedAt,
                values: { ...query.data?.values, ...values },
              });
            }}
          >
            <fieldset
              aria-busy={query.isPending}
              disabled={query.isPending}
              className="min-w-0 space-y-4 border-0 p-0"
            >
              <client.SettingsForm />
            </fieldset>
            <Submit disabled={query.isPending} disabledUntilDirty>
              Save Settings
            </Submit>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
