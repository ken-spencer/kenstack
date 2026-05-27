"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import fetcher from "@kenstack/api/fetcher";
import Button from "@kenstack/components/Button";
import Progress from "@kenstack/components/Progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kenstack/components/ui/dialog";
import FieldLayout from "@kenstack/forms/FieldLayout";
import Form from "@kenstack/forms/Form";
import Notice from "@kenstack/forms/Notice";
import Submit from "@kenstack/forms/Submit";
import type { SettingsClient } from "@kenstack/admin/client";

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
  const queryClient = useQueryClient();
  const queryKey = ["module-settings", name] as const;
  const query = useQuery({
    queryKey,
    enabled: open,
    retry: false,
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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {query.isPending ? (
          <Progress className="size-12" />
        ) : query.isError ? (
          <div className="space-y-4">
            <div className="text-sm text-red-700">
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
            className="space-y-4"
            schema={client.schema}
            defaultValues={query.data}
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
            <Notice />
            <FieldLayout fields={client.fields} />
            <Submit disabledUntilDirty>Save Settings</Submit>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
