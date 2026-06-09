"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import fetcher from "@kenstack/api/fetcher";
import FormNavButton from "@kenstack/forms/NavButton";
import { useAdminEdit } from "./context";

export default function NeighborButtons() {
  const searchParams = useSearchParams();
  const { id, name, listPath, single } = useAdminEdit();
  const query = searchParams.toString();
  const recordId = id ?? 0;
  const { data } = useQuery({
    enabled: !single && recordId > 0,
    queryFn: () =>
      fetcher<{
        previousId: number | null;
        nextId: number | null;
      }>("/api/admin", {
        action: "neighbors",
        id: recordId,
        name,
        query,
      }),
    queryKey: ["admin-list", name, "neighbors", recordId, query],
    staleTime: 60 * 1000,
  });

  if (single || typeof id !== "number") {
    return null;
  }

  if (data?.status !== "success") {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <NeighborButton
        listPath={listPath}
        searchParams={searchParams}
        targetId={data.previousId}
        tooltip="Previous Entry"
      >
        <ChevronLeft className="size-5 text-gray-800" />
      </NeighborButton>
      <NeighborButton
        listPath={listPath}
        searchParams={searchParams}
        targetId={data.nextId}
        tooltip="Next Entry"
      >
        <ChevronRight className="size-5 text-gray-800" />
      </NeighborButton>
    </div>
  );
}

function NeighborButton({
  children,
  listPath,
  searchParams,
  targetId,
  tooltip,
}: {
  children: ReactNode;
  listPath: string;
  searchParams: ReturnType<typeof useSearchParams>;
  targetId: number | null;
  tooltip: string;
}) {
  const href = targetId
    ? listPath + "/" + targetId + (searchParams.size ? "?" + searchParams : "")
    : listPath;

  return (
    <FormNavButton
      disabled={!targetId}
      href={href}
      size="icon"
      tooltip={tooltip}
      variant="ghost"
    >
      {children}
    </FormNavButton>
  );
}
