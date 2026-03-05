import type { ReactNode } from "react";

import {
  // useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarTrigger,
} from "@kenstack/components/ui/sidebar";

import Form from "./Form";

export function AppSidebar() {
  return (
    <Sidebar side="right" className="[--sidebar-width:20rem] bg-blue-900">
      <SidebarHeader className="border bg-gray-100">
        <div className="flex">
          <SidebarTrigger className="cursor-pointer" />
          <h3 className="flex-grow font-bold text-center">Meta Tags</h3>{" "}
        </div>
      </SidebarHeader>
      <SidebarContent className="h-full bg-white">
        <SidebarGroup>
          <Form />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
