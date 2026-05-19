"use client";

import { CircleCheck, EyeOff, PencilLine } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";

import Field from "@kenstack/forms/Field";
import { ImageField } from "@kenstack/admin/forms";
import DateField from "@kenstack/forms/DateField";
import InputField from "@kenstack/forms/InputField";
import TextareaField from "@kenstack/forms/TextareaField";
import { visibilityOptions } from "@kenstack/admin/metadata";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@kenstack/components/ui/accordion";

const statusIcons = {
  draft: PencilLine,
  published: CircleCheck,
  unlisted: EyeOff,
};

type StatusValue = keyof typeof statusIcons;

function StatusIcon({ value }: { value: StatusValue }) {
  const Icon = statusIcons[value];
  return <Icon className="size-3.5" />;
}

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

export default function MetaFields() {
  const { watch } = useFormContext();
  const visibility = watch("visibility");
  const publishedAt = watch("publishedAt");
  const publishSummary =
    visibility === "published" ? formatPublishedAt(publishedAt) : "Not listed";

  return (
    <div className="space-y-3 rounded border p-3">
      <Field
        name="visibility"
        label="Status"
        render={({ field }) => (
          <div className="grid grid-cols-3 gap-1.5">
            {visibilityOptions.map(([value, label]) => (
              <label key={value} className="cursor-pointer text-xs">
                <input
                  {...field}
                  type="radio"
                  value={value}
                  checked={field.value === value}
                  className="peer sr-only"
                  onChange={() => {
                    field.onChange(value);
                  }}
                />
                <span className="flex min-h-9 items-center justify-center gap-1 rounded border border-gray-200 px-2 text-center transition peer-checked:border-fuchsia-800 peer-checked:bg-fuchsia-800/85 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-fuchsia-800 peer-focus-visible:ring-offset-2 hover:bg-gray-50 peer-checked:hover:bg-fuchsia-800">
                  <StatusIcon value={value} />
                  {label}
                </span>
              </label>
            ))}
          </div>
        )}
      />

      <Accordion type="single" collapsible className="border-t border-gray-200">
        <AccordionItem value="meta">
          <AccordionTrigger className="my-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 hover:no-underline">
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="text-sm font-medium">Scheduling & Meta</span>
              <span className="truncate text-xs font-normal text-gray-500">
                {publishSummary}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <DateField
              disabled={visibility !== "published"}
              name="publishedAt"
              label="Publish On"
            />
            <InputField
              label="SEO Title (If different than Title)"
              name="seoTitle"
            />
            <TextareaField
              label="SEO Description (if different than Description)"
              name="seoDescription"
            />
            <ImageField
              help="The image shown in social media and messaging app previews when this page is shared. If left empty, the site default image is used."
              label="Open Graph Image (1200 x 630)"
              name="ogImage"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
