"use client";

import type { ComponentType, ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@kenstack/components/Accordion";

function formatPublishedAt(value: unknown) {
  if (!value) {
    return "No publish date";
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.valueOf())) {
    return "No publish date";
  }

  return format(date, "MMM d, yyyy");
}

export default function MetaFields({
  fields,
  className,
}: {
  fields: MetaFieldComponents;
  className?: string;
}) {
  const {
    visibility: VisibilityField,
    publishedAt: PublishedAtField,
    seoTitle: SeoTitleField,
    seoDescription: SeoDescriptionField,
    ogImage: OgImageField,
  } = fields;
  const { watch } = useFormContext();
  const visibility = watch("visibility");
  const publishedAt = watch("publishedAt");
  const isDraft = visibility === "draft";
  const publishSummary = isDraft
    ? "Not listed"
    : formatPublishedAt(publishedAt);
  const metaFieldCount = [
    PublishedAtField,
    SeoTitleField,
    SeoDescriptionField,
    OgImageField,
  ].filter(Boolean).length;
  const showMetaFields = metaFieldCount > 0;
  const showAccordion = metaFieldCount > 1;
  const accordionTitle =
    SeoTitleField || SeoDescriptionField || OgImageField
      ? "Scheduling & Meta"
      : "Scheduling";
  const metaFields = (
    <>
      {PublishedAtField ? <PublishedAtField disabled={isDraft} /> : null}
      {SeoTitleField ? <SeoTitleField /> : null}
      {SeoDescriptionField ? <SeoDescriptionField /> : null}
      {OgImageField ? (
        <OgImageField help="The image shown in social media and messaging app previews when this page is shared. If left empty, the site default image is used." />
      ) : null}
    </>
  );

  return (
    <div className={twMerge("space-y-4", className)}>
      {VisibilityField ? (
        <VisibilityField
          groupClassName="grid grid-cols-3 gap-1.5"
          buttonClassName="min-w-0"
        />
      ) : null}

      {showAccordion ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="meta">
            <AccordionTrigger className="border-border bg-muted rounded border px-4 py-2 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="text-sm font-medium">{accordionTitle}</span>
                <span
                  className="text-muted-foreground truncate text-xs font-normal"
                  suppressHydrationWarning
                >
                  {publishSummary}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {metaFields}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : showMetaFields ? (
        <div className="space-y-4">{metaFields}</div>
      ) : null}
    </div>
  );
}

type CommonFieldProps = {
  className?: string;
  help?: ReactNode;
};

type MetaFieldComponents = {
  visibility?: ComponentType<
    CommonFieldProps & {
      buttonClassName?: string;
      groupClassName?: string;
    }
  >;
  publishedAt?: ComponentType<CommonFieldProps & { disabled?: boolean }>;
  seoTitle?: ComponentType<CommonFieldProps>;
  seoDescription?: ComponentType<CommonFieldProps>;
  ogImage?: ComponentType<CommonFieldProps>;
};
