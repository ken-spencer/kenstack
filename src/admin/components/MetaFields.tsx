"use client";

import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { ImageField } from "@kenstack/admin/forms";
import DateTimeField from "@kenstack/forms/DateTimeField";
import InputField from "@kenstack/forms/InputField";
import RadioButtonField from "@kenstack/forms/RadioButtonField";
import TextareaField from "@kenstack/forms/TextareaField";
import { visibilityStatusOptions } from "@kenstack/admin/lib/visibilityStatus";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@kenstack/components/ui/accordion";

const defaultFields = {
  visibility: true,
  publishedAt: true,
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
} as const;

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
  fields = defaultFields,
  className,
}: {
  fields?: Partial<Record<keyof typeof defaultFields, boolean>>;
  className?: string;
}) {
  const { setValue, watch } = useFormContext();
  const visibility = watch("visibility");
  const publishedAt = watch("publishedAt");
  const isDraft = visibility === "draft";
  const publishSummary = isDraft
    ? "Not listed"
    : formatPublishedAt(publishedAt);
  const showAccordion =
    fields.publishedAt ||
    fields.seoTitle ||
    fields.seoDescription ||
    fields.ogImage;
  const accordionTitle =
    fields.seoTitle || fields.seoDescription || fields.ogImage
      ? "Scheduling & Meta"
      : "Scheduling";

  return (
    <div className={twMerge("space-y-4", className)}>
      {fields.visibility ? (
        <RadioButtonField
          name="visibility"
          label="Status"
          groupClassName="grid grid-cols-3 gap-1.5"
          buttonClassName="min-w-0"
          options={visibilityStatusOptions}
          onValueChange={(value) => {
            if (value !== "draft" && fields.publishedAt && !publishedAt) {
              setValue("publishedAt", new Date().toISOString(), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }
          }}
        />
      ) : null}

      {showAccordion ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="meta">
            <AccordionTrigger className="rounded border border-gray-200 bg-gray-50 px-4 py-2 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="text-sm font-medium">{accordionTitle}</span>
                <span className="truncate text-xs font-normal text-gray-500">
                  {publishSummary}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {fields.publishedAt ? (
                <DateTimeField
                  disabled={isDraft}
                  name="publishedAt"
                  label="Publish On"
                />
              ) : null}
              {fields.seoTitle ? (
                <InputField
                  label="SEO Title (If different than Title)"
                  name="seoTitle"
                />
              ) : null}
              {fields.seoDescription ? (
                <TextareaField
                  label="SEO Description (if different than Description)"
                  name="seoDescription"
                />
              ) : null}
              {fields.ogImage ? (
                <ImageField
                  help="The image shown in social media and messaging app previews when this page is shared. If left empty, the site default image is used."
                  label="Open Graph Image (1200 x 630)"
                  name="ogImage"
                />
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
