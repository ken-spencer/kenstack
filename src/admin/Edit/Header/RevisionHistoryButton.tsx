"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useFormContext } from "react-hook-form";

import Alert from "@kenstack/components/Alert";
import { Skeleton } from "@kenstack/components/Skeleton";
import Tooltip from "@kenstack/components/Tooltip";
import { Button } from "@kenstack/components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { dateFormat } from "@kenstack/lib/dateFormat";
import fetcher from "@kenstack/api/fetcher";
import { useForm } from "@kenstack/forms/context";
import { useAdminEdit } from "../context";

type RevisionSummary = {
  id: number;
  createdAt: string;
  createdBy: number | null;
  createdByName: string | null;
  changes: string[];
};

type RevisionDetail = {
  revision: {
    id: number;
    snapshot: Record<string, unknown>;
  };
};

export default function RevisionHistoryButton() {
  const [open, setOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<{
    id: number;
    selectedAt: number;
  } | null>(null);
  const { reset, setValue } = useFormContext<Record<string, unknown>>();
  const { mutation, setStatusMessage } = useForm();
  const { apiPath, defaultValues, id, isNew, name, schema, single } =
    useAdminEdit();
  const revisionsLoadTarget = single ? name : id;
  const selectedRevisionId =
    selectedRevision && selectedRevision.selectedAt > mutation.submittedAt
      ? selectedRevision.id
      : null;

  const revisionsQuery = useQuery({
    queryFn: () =>
      fetcher<{ revisions: RevisionSummary[] }>(apiPath, {
        action: "revisions",
        name,
        id,
      }),
    queryKey: ["admin-edit", name, revisionsLoadTarget, "revisions"],
    enabled: open && typeof id === "number",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const revisionMutation = useMutation({
    mutationFn: (revisionId: number) => {
      if (typeof id !== "number") {
        throw Error("A valid id is required to load a revision.");
      }

      return fetcher<RevisionDetail>(apiPath, {
        action: "revisions",
        name,
        id,
        revisionId,
      });
    },
    onError: (error) => {
      setStatusMessage(error);
    },
    onSuccess: (data) => {
      if (data.status === "error") {
        setStatusMessage(data);
        return;
      }

      reset(defaultValues);
      Object.entries(data.revision.snapshot).forEach(([fieldName, value]) => {
        if (fieldName in schema.shape) {
          setValue(fieldName, value, { shouldDirty: true });
        }
      });
      setSelectedRevision({ id: data.revision.id, selectedAt: Date.now() });
      setOpen(false);
    },
  });

  if (isNew) {
    return null;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && typeof id === "number") {
          revisionsQuery.refetch();
        }
      }}
    >
      <Tooltip content="History">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-foreground"
          >
            <History className="size-6" />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div className="text-sm font-medium">History</div>
          <div className="text-muted-foreground shrink-0 text-xs">
            {revisionsQuery.data?.status === "success"
              ? `${revisionsQuery.data.revisions.length} revisions`
              : "Revisions"}
          </div>
        </div>
        {revisionsQuery.error ? (
          <Alert className="m-2">{revisionsQuery.error.message}</Alert>
        ) : revisionsQuery.isPending ? (
          <div className="space-y-2 p-2">
            <RevisionSkeleton />
            <RevisionSkeleton />
            <RevisionSkeleton />
          </div>
        ) : revisionsQuery.data?.status === "error" ? (
          <Alert className="m-2" {...revisionsQuery.data} />
        ) : !revisionsQuery.data?.revisions.length ? (
          <div className="text-muted-foreground p-3 text-sm">No revisions</div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-2">
            {revisionsQuery.data.revisions.map((revision, index) => {
              const isSelected = selectedRevisionId === revision.id;
              const showsMarker =
                isSelected || (selectedRevisionId === null && index === 0);

              return (
                <button
                  key={revision.id}
                  type="button"
                  className={
                    "hover:bg-muted group flex w-full items-start gap-3 rounded px-2 py-2 text-left transition" +
                    (isSelected ? " bg-muted" : "")
                  }
                  onClick={() => {
                    revisionMutation.mutate(revision.id);
                  }}
                  disabled={revisionMutation.isPending}
                >
                  <span className="mt-1 flex size-4 items-center justify-center">
                    <span
                      className={
                        "size-2 rounded-full bg-blue-600 opacity-0 transition group-hover:opacity-100" +
                        (showsMarker ? " opacity-100" : "")
                      }
                    />
                  </span>
                  <span className="flex min-w-0 grow items-center justify-between gap-3">
                    <time
                      dateTime={revision.createdAt}
                      className="text-foreground truncate text-sm font-medium"
                    >
                      {dateFormat(revision.createdAt)}
                    </time>
                    <span className="text-muted-foreground shrink-0 truncate text-xs">
                      {revision.createdByName ?? "System"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RevisionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
