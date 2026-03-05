"use client";
import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@kenstack/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// import Content from "./Content";

export default function AdminSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <SidebarProvider className="flex" defaultOpen={false}>
        <div className="flex flex-grow">
          <div className="flex-grow">{children}</div>
          <div className="relative w-9">
            <div className="fixed">
              <SidebarTrigger className="cursor-pointer" />
            </div>
          </div>
        </div>
        <AppSidebar />
      </SidebarProvider>
    </Suspense>
  );
}
