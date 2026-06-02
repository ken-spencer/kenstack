"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import Alert from "@kenstack/components/Alert";
import Progress from "@kenstack/components/Progress";
import { Badge } from "@kenstack/components/ui/badge";
import { Button } from "@kenstack/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@kenstack/forms/controls/Combobox";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import useDebounce from "@kenstack/hooks/useDebounce";
import fetcher, { type FetchResult } from "@kenstack/api/fetcher";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

type RelationshipOption = {
  id: number;
  label: string;
};

type RelationshipFieldProps = React.ComponentProps<"div"> &
  FieldProps & {
    relationship: string;
    placeholder?: string;
  };

function isRelationshipOption(value: unknown): value is RelationshipOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "label" in value &&
    typeof value.id === "number" &&
    typeof value.label === "string"
  );
}

function toRelationshipOptions(value: unknown): RelationshipOption[] {
  return Array.isArray(value) ? value.filter(isRelationshipOption) : [];
}

function RelationshipControl({
  field,
  relationship,
  placeholder,
}: {
  field: ControllerRenderProps<FieldValues, string>;
  relationship: string;
  placeholder: string;
}) {
  const { apiPath, name: adminName } = useAdminEdit();
  const [keywords, debouncedKeywords, setKeywords] = useDebounce();
  const [open, setOpen] = useState(false);
  const selected = toRelationshipOptions(field.value);
  const exclude = selected.map((item) => item.id);

  const { data, error, isPending } = useQuery<
    FetchResult<{ items: RelationshipOption[] }>,
    Error
  >({
    queryKey: [
      "relationship-search",
      adminName,
      relationship,
      debouncedKeywords,
      exclude,
    ],
    queryFn: async () =>
      fetcher(apiPath, {
        action: "relationship-search",
        name: adminName,
        relationship,
        keywords: debouncedKeywords,
        exclude,
      }),
    placeholderData: keepPreviousData,
    enabled: open || debouncedKeywords.length > 0,
  });

  const items = data?.status === "success" ? data.items : [];

  return (
    <div className="space-y-2">
      <Combobox<RelationshipOption>
        items={items}
        open={open}
        inputValue={keywords}
        value={null}
        filter={null}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => String(item.id)}
        isItemEqualToValue={(item, value) => item.id === value.id}
        onInputValueChange={(value) => {
          setKeywords(value);
        }}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
        }}
        onValueChange={(item) => {
          if (item) {
            field.onChange(
              [...selected, item].sort((a, b) =>
                a.label.localeCompare(b.label),
              ),
            );
            setKeywords("");
          }
        }}
      >
        <ComboboxInput placeholder={placeholder} showClear className="w-full" />
        <ComboboxContent>
          {error ? (
            <Alert>{error.message}</Alert>
          ) : data?.status === "error" ? (
            <Alert>{data.message}</Alert>
          ) : isPending ? (
            <div className="py-6">
              <Progress className="size-8" />
            </div>
          ) : (
            <>
              <ComboboxEmpty>No matches found.</ComboboxEmpty>
              <ComboboxList>
                {items.map((item) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </>
          )}
        </ComboboxContent>
      </Combobox>

      {selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.label}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5"
                onClick={() => {
                  field.onChange(
                    selected.filter(
                      (selectedItem) => selectedItem.id !== item.id,
                    ),
                  );
                }}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RelationshipField({
  name,
  label,
  description,
  relationship,
  placeholder = "Search...",
  className,
}: RelationshipFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <RelationshipControl
          field={field}
          relationship={relationship}
          placeholder={placeholder}
        />
      )}
    />
  );
}
