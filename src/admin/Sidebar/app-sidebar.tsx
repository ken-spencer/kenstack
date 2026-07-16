"use client";

import {
  useSidebar,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "@kenstack/components/Sidebar";

import { X } from "lucide-react";
import { Button } from "@kenstack/components/Button";
import KenstackLogo from "./KenstackLogo";

export function AppSidebar({ content }: { content: React.ReactNode }) {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <Sidebar className="border-border/40 [&_[data-slot=sidebar-inner]]:bg-background [&_[data-active=true]]:bg-transparent">
      <SidebarHeader className="bg-background">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <SidebarTrigger className={isMobile ? "hidden" : ""} />
            <div className="flex h-9 items-center group-data-[collapsible=icon]:hidden">
              <KenstackLogo className="h-9 w-auto" />
            </div>
          </div>
          <Button
            className={isMobile ? "" : "hidden"}
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
          >
            <X className="size-6" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-background">{content}</SidebarContent>
    </Sidebar>
  );
}
