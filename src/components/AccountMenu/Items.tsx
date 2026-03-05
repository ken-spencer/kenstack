import Link from "next/link";
import { Button } from "@kenstack/components/ui/button";
import { deps } from "@app/deps";

// import {
//   // Pencil,
//   HandHelping,
//   Globe,
//   RectangleEllipsis,
//   UserPen,
// } from "lucide-react";

// type Items = [
//   href: string,
//   title: string,
//   icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
// ][];

// const links = [
//   ["/manage", "Requests", HandHelping],
//   ["/manage/organizations", "Organizations", Globe],
//   ["/profile", "Profile", UserPen],
//   ["/reset-password", "Reset Password", RectangleEllipsis],
// ] satisfies Items;

export default function AccountMenuItems() {
  return (
    <>
      {/* {data.roles.includes("admin") && (
        <Link className="w-full justify-start" href="/admin" key="admin">
          <Pencil /> Admin
        </Link>
      )} */}
      {items.map(([href, text, Icon], key) => (
        <Button key={href + key} variant="link" asChild>
          <Link className="w-full justify-start" href={href}>
            <Icon />
            {text}
          </Link>
        </Button>
      ))}
    </>
  );
}
