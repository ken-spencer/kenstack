"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@kenstack/lib/utils";

type ItemAccordionProps = {
  defaultValue?: string;
  items: {
    slug: string;
    title: React.ReactNode;
    content: React.ReactNode;
  }[];
};

function subscribeHashChange(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);

  return () => {
    window.removeEventListener("hashchange", onStoreChange);
  };
}

function getHashValue() {
  return window.location.hash.replace(/^#/, "");
}

function Accordion(
  props:
    | ItemAccordionProps
    | React.ComponentProps<typeof AccordionPrimitive.Root>,
) {
  if ("items" in props) {
    return <ItemAccordion {...props} />;
  }

  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function ItemAccordion({ defaultValue = "", items }: ItemAccordionProps) {
  const hashValue = React.useSyncExternalStore(
    subscribeHashChange,
    getHashValue,
    () => "",
  );
  const [manualValue, setManualValue] = React.useState<string | null>(null);
  const value = manualValue ?? (defaultValue || hashValue);
  const pathname = usePathname();

  return (
    <Accordion type="single" collapsible value={value}>
      {items.map(({ slug, title, content }) => (
        <AccordionItem
          className="accordion-item"
          id={slug}
          value={slug}
          key={slug}
        >
          <AccordionTrigger
            className="cursor-pointer text-base"
            onClick={(evt) => {
              if (value === slug) {
                setManualValue("");
                window.history.replaceState(null, "", pathname);
              } else {
                setManualValue(slug);
                window.history.replaceState(null, "", "#" + slug);
              }

              const button = evt.currentTarget;
              if (button.dataset.state === "open") {
                return;
              }

              const parent = button.closest(".accordion-item");
              let openNode: HTMLElement | undefined;
              for (
                let sibling = parent?.previousElementSibling;
                sibling;
                sibling = sibling.previousElementSibling
              ) {
                if (
                  sibling instanceof HTMLElement &&
                  sibling.dataset.state === "open"
                ) {
                  openNode = sibling;
                  break;
                }
              }

              if (!openNode) {
                return;
              }

              const openContent =
                openNode.querySelector<HTMLElement>(".accordion-content");
              if (!openContent) {
                return;
              }

              const rect = button.getBoundingClientRect();
              if (rect.top - openContent.offsetHeight < 0) {
                window.scrollBy({
                  top: -openContent.offsetHeight,
                });
              }
            }}
          >
            {title}
          </AccordionTrigger>
          <AccordionContent className="accordion-content">
            {content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-3 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
