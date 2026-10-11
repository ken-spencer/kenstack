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
import { hasAccess } from "@kenstack/auth/server/auth";

import Content from "./Content";

const sidebarCookieName = "sidebar_state";

type AdminSidebarProps = {
  accountMenu?: React.ReactNode;
  logo?: React.ReactNode;
  platformLogo?: React.ReactNode;
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

async function AdminSidebarContent({
  accountMenu,
  logo,
  platformLogo,
  sidebarAfter,
  sidebarBefore,
  children,
  defaultOpen,
}: AdminSidebarProps & { defaultOpen: boolean }) {
  const moduleLinks = (
    await Promise.all(
      Object.entries(modules).map(async ([name, module]) =>
        module.admin && (await hasAccess({ module: name, permission: "view" }))
          ? [
              {
                href: "/admin/" + name,
                headerIcon: module.icon ? (
                  <module.icon className="text-sidebar-foreground size-4" />
                ) : null,
                icon: module.icon ? <module.icon /> : <span className="w-3" />,
                name,
                title: module.title,
              },
            ]
          : [],
      ),
    )
  ).flat();
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

  // A plain link is admin-only unless it names who sees it.
  const navigationLinks = modules[adminNavigation].flatMap(({ items }) =>
    items.filter((item) => typeof item !== "string"),
  );
  const openLinkHrefs = new Set(
    (
      await Promise.all(
        navigationLinks.map(async (link) =>
          (await hasAccess(link.access ?? "admin")) ? [link.href] : [],
        ),
      )
    ).flat(),
  );

  const sidebarNav = (
    <>
      {sidebarBefore}
      {modules[adminNavigation].map(({ heading, items }, index) => {
        const links = items.flatMap((item) => {
          if (typeof item !== "string") {
            if (!openLinkHrefs.has(item.href)) {
              return [];
            }
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
          const childLinks = childLinksByParent.get(item) ?? [];
          // A child the person can open stands on its own when its parent isn't visible to them.
          return link
            ? [
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  title={link.title}
                  navChildren={childLinks}
                />,
              ]
            : childLinks.map((child) => (
                <NavLink
                  key={child.href}
                  href={child.href}
                  icon={child.icon}
                  title={child.title}
                />
              ));
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
          <AppSidebar content={sidebarNav} platformLogo={platformLogo} />
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
