import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@kenstack/components/ui/sidebar";
import { Skeleton } from "@kenstack/components/ui/skeleton";
import { AppSidebar } from "./app-sidebar";
import AccountMenu from "@kenstack/components/AccountMenu";
import NavLink from "./NavLink";
import { deps } from "@app/deps";

import Content from "./Content";

const sidebarCookieName = "sidebar_state";

type AdminSidebarProps = {
  accountMenu?: React.ReactNode;
  logo?: React.ReactNode;
  children: React.ReactNode;
};

const accountMenuFallback = <Skeleton className="size-9 rounded-full" />;

export default function AdminSidebar(props: AdminSidebarProps) {
  return (
    <Suspense fallback={null}>
      <AdminSidebarWithDefaultOpen {...props} />
    </Suspense>
  );
}

async function AdminSidebarWithDefaultOpen(props: AdminSidebarProps) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(sidebarCookieName)?.value !== "false";

  return <AdminSidebarContent {...props} defaultOpen={defaultOpen} />;
}

function AdminSidebarContent({
  accountMenu,
  logo,
  children,
  defaultOpen,
}: AdminSidebarProps & { defaultOpen: boolean }) {
  const adminModules = Object.entries(deps.modules).flatMap(
    ([name, module]) => {
      if (!module.admin) {
        return [];
      }

      return [
        {
          href: "/admin/" + name,
          headerIcon: module.icon ? (
            <module.icon className="size-4 text-gray-800" />
          ) : null,
          icon: module.icon ? <module.icon /> : <span className="w-3" />,
          title: module.title,
        },
      ];
    },
  );

  const sidebarNav = (
    <SidebarGroup>
      <SidebarGroupLabel>Administration</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminModules.map(({ href, icon, title }) => {
            return <NavLink key={href} href={href} icon={icon} title={title} />;
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <SidebarProvider className="flex" defaultOpen={defaultOpen}>
      <AppSidebar content={sidebarNav} />
      <Content
        logo={logo}
        moduleLinks={adminModules.map(({ headerIcon, href, title }) => ({
          href,
          icon: headerIcon,
          title,
        }))}
        accountMenu={
          <Suspense fallback={accountMenuFallback}>
            {accountMenu ?? <AccountMenu fallback={accountMenuFallback} />}
          </Suspense>
        }
      >
        {children}
      </Content>
    </SidebarProvider>
  );
}
