import Link from "next/link";

import { contextLabels, type StyleGuideContext } from "./StyleGuide";

export default function StyleGuidePage({
  context,
}: {
  context: StyleGuideContext;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Style guide</h1>
        <p className="text-muted-foreground mt-1">
          Compare the shared components in their isolated theme contexts.
        </p>
      </header>

      <nav
        aria-label="Style-guide context"
        className="border-border flex w-fit gap-1 rounded-lg border p-1"
      >
        {Object.entries(contextLabels).map(([value, label]) => {
          const isSelected = value === context;

          return (
            <Link
              aria-current={isSelected ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              href={`/admin/style-guide?context=${value}`}
              key={value}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <iframe
        className="border-border h-[calc(100svh-13rem)] min-h-[40rem] w-full rounded-lg border bg-white"
        id="style-guide"
        src={`/style-guide/${context}`}
        title={`${contextLabels[context]} style guide`}
      />
    </div>
  );
}
