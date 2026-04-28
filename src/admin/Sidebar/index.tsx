import { Suspense } from "react";
import Link from "next/link";
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@kenstack/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import AccountMenu from "@kenstack/components/AccountMenu";
import { type AdminConfig } from "@kenstack/admin";

import Content from "./Content";

export default function AdminSidebar({
  content,
  adminConfig,
  children,
}: {
  content: React.ReactNode;
  adminConfig: AdminConfig;
  children: React.ReactNode;
}) {
  const sidebarNav = (
    <SidebarGroup>
      <SidebarGroupLabel>Administration</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminConfig.map(([name, table]) => (
            <SidebarMenuItem key={name}>
              <SidebarMenuButton asChild>
                <Link href={"/admin/" + name}>
                  {table.icon ? <table.icon /> : <span className="w-3" />}
                  <span>{table.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <SidebarProvider
      className="flex"
      // defaultOpen={false}
    >
      <AppSidebar content={sidebarNav} />
      <Content
        accountMenu={
          <Suspense>
            <AccountMenu fallback={null} />
          </Suspense>
        }
      >
        {children}
      </Content>
    </SidebarProvider>
  );
}
