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
import Notice from "@kenstack/forms/Notice";
import Submit from "@kenstack/forms/Submit";
import { QueryBoundary } from "@kenstack/context/QueryProvider";
import type { SettingsClient } from "@kenstack/admin/client";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import FieldLayout from "./FieldLayout";

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
    <QueryBoundary>
      <ModuleSettingsModalContent
        client={client}
        description={description}
        name={name}
        open={open}
        onOpenChange={onOpenChange}
        title={title}
      />
    </QueryBoundary>
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

      return result.values;
    },
  });
  const defaultValues = useMemo(
    () => query.data ?? createDefaultValues(client.fields),
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
            mutationFn={async (values) =>
              fetcher<SettingsLoadResult>("/api/admin", {
                action: "save-module-settings",
                name,
                values,
              })
            }
            onSubmit={({ data, mutation }) => {
              return mutation.mutateAsync(data);
            }}
            onSuccess={(result) => {
              queryClient.setQueryData(queryKey, result.values);
            }}
          >
            <fieldset
              aria-busy={query.isPending}
              disabled={query.isPending}
              className="min-w-0 space-y-4 border-0 p-0"
            >
              <Notice />
              <FieldLayout fields={client.fields} />
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
