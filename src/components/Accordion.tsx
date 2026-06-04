"use client";

import { type ReactNode, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import {
  Accordion as UIAccordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@kenstack/components/ui/accordion";

type AccordionProps = {
  defaultValue?: string;
  items: {
    slug: string;
    title: ReactNode;
    content: ReactNode;
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

export function Accordion({ defaultValue = "", items }: AccordionProps) {
  const hashValue = useSyncExternalStore(
    subscribeHashChange,
    getHashValue,
    () => "",
  );
  const [manualValue, setManualValue] = useState<string | null>(null);
  const value = manualValue ?? (defaultValue || hashValue);
  const pathname = usePathname();

  return (
    <UIAccordion type="single" collapsible value={value}>
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

              const parent = button.closest(
                ".accordion-item",
              ) as HTMLElement | null;
              let openNode: HTMLElement | undefined;
              for (
                let p = parent?.previousElementSibling as HTMLElement | null;
                p;
                p = p.previousElementSibling as HTMLElement | null
              ) {
                if (p.dataset.state === "open") {
                  openNode = p;
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
    </UIAccordion>
  );
}
