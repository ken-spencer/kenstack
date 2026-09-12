import type { ReactNode } from "react";

// A bordered group of related fields in an admin edit form.
export default function Section({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-md border border-[var(--admin-divider)] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
