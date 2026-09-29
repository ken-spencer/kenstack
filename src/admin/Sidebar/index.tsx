import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@kenstack/components/Sidebar";
import { Skeleton } from "@kenstack/components/Skeleton";
import QueryProvider from "@kenstack/context/QueryProvider";
import { NavigationBlockerProvider } from "@kenstack/forms/NavigationBlocker";
import { AppSidebar } from "./app-sidebar";
import AccountMenu from "@kenstack/components/AccountMenu";
import NavLink from "./NavLink";
import { modules } from "@app/modules";
import { adminNavigation } from "@kenstack/admin/module";

import Content from "./Content";

const sidebarCookieName = "sidebar_state";

type AdminSidebarProps = {
  accountMenu?: React.ReactNode;
  logo?: React.ReactNode;
  sidebarAfter?: React.ReactNode;
  sidebarBefore?: React.ReactNode;
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
  sidebarAfter,
  sidebarBefore,
  children,
  defaultOpen,
}: AdminSidebarProps & { defaultOpen: boolean }) {
  const moduleLinks = Object.entries(modules).flatMap(([name, module]) => {
    if (!module.admin) {
      return [];
    }

    return [
      {
        href: "/admin/" + name,
        headerIcon: module.icon ? (
          <module.icon className="text-sidebar-foreground size-4" />
        ) : null,
        icon: module.icon ? <module.icon /> : <span className="w-3" />,
        name,
        title: module.title,
      },
    ];
  });
  const childLinksByParent = new Map<string, typeof moduleLinks>();

  for (const link of moduleLinks) {
    const moduleConfig = modules[link.name];
    const navigationParent = moduleConfig.navigationParent;

    if (!navigationParent || moduleConfig.parent) {
      continue;
    }

    childLinksByParent.set(navigationParent, [
      ...(childLinksByParent.get(navigationParent) ?? []),
      link,
    ]);
  }

  const moduleLinksByName = new Map(
    moduleLinks.map((link) => [link.name, link]),
  );

  const sidebarNav = (
    <>
      {sidebarBefore}
      {modules[adminNavigation].map(({ heading, items }, index) => {
        const links = items.flatMap((item) => {
          if (typeof item !== "string") {
            return [
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon ? <item.icon /> : <span className="w-3" />}
                title={item.title}
              />,
            ];
          }

          const link = moduleLinksByName.get(item);
          return link
            ? [
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  title={link.title}
                  navChildren={childLinksByParent.get(item)}
                />,
              ]
            : [];
        });

        return links.length > 0 ? (
          <SidebarGroup key={index}>
            {heading ? <SidebarGroupLabel>{heading}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>{links}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null;
      })}
      {sidebarAfter}
    </>
  );

  return (
    <QueryProvider>
      <SidebarProvider className="flex" defaultOpen={defaultOpen}>
        <NavigationBlockerProvider>
          <AppSidebar content={sidebarNav} />
          <Content
            logo={logo}
            moduleLinks={moduleLinks.map(({ headerIcon, name, title }) => ({
              icon: headerIcon,
              name,
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
        </NavigationBlockerProvider>
      </SidebarProvider>
    </QueryProvider>
  );
}

export { default as AdminSidebarNavLink } from "./NavLink";
