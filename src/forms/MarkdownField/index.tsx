"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@kenstack/components/Skeleton";

import type { InputProps } from "./MarkdownField";

const MarkdownField = dynamic(() => import("./MarkdownField"), {
  ssr: false,
  loading: () => <MarkdownFieldLoading />,
});

export default function MarkdownFieldCont(props: InputProps) {
  return <MarkdownField {...props} />;
}

function MarkdownFieldLoading() {
  return (
    <div className="space-y-2" aria-busy="true">
      <div className="border-input bg-background overflow-hidden rounded-md border">
        <div className="border-input bg-muted flex h-[45px] items-center gap-2 rounded-t-[3px] border-b px-[25px]">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="min-h-[350px] space-y-2 px-3 py-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
