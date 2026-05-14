"use client";

import { useEffect } from "react";

import {
  useSidebar,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "@kenstack/components/ui/sidebar";

import cookies from "js-cookie";

import { X } from "lucide-react";
import { Button } from "@kenstack/components/ui/button";
import KenstackLogo from "./KenstackLogo";

export function AppSidebar({ content }: { content: React.ReactNode }) {
  const { toggleSidebar, open, isMobile, openMobile } = useSidebar();
  const visible = isMobile ? openMobile : open;
  useEffect(() => {
    // window.sessionStorage.setItem("sidebar-open", visible ? "1" : "0");
    cookies.set("sidebarOpen", visible ? "1" : "0", {
      expires: 365,
    });
  }, [visible]);
  return (
    <Sidebar className="border-none">
      <SidebarHeader className="bg-gray-100">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <SidebarTrigger className={isMobile ? "hidden" : ""} />
            <KenstackLogo className="h-9 w-auto group-data-[collapsible=icon]:hidden" />
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
      <SidebarContent className="bg-gray-100">{content}</SidebarContent>
    </Sidebar>
  );
}
