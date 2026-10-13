/* Public entry point: the call-to-action button every email uses, such as "View task". Exports only
 * EmailButton. */
import type { ReactNode } from "react";
import { Button } from "react-email";

export default function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: "#111111",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "bold",
        padding: "12px 22px",
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  );
}
