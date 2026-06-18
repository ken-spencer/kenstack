import { useState, useRef } from "react";

import { Tag as TagIcon } from "lucide-react";
import Progress from "@kenstack/components/Progress";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Alert from "@kenstack/components/Alert";
import fetcher, { type FetchResult } from "@kenstack/api/fetcher";
import useDebounce from "@kenstack/hooks/useDebounce";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import kebabCase from "lodash-es/kebabCase";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@kenstack/forms/controls/Combobox";

import type { Tag } from "./types";
import { type AnyField } from "@kenstack/forms/types";

type TagSearchOption = Tag & { count: number };

export default function TagSearcht({ field }: { field: AnyField }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keywords, debouncedValue, setKeywords] = useDebounce();
  const [focusing, setFocusing] = useState(false);
  const [highlightedTag, setHighlightedTag] =
    useState<TagSearchOption | null>(null);
  const { apiPath, name: adminName } = useAdminEdit();

  const { data, error, isPending } = useQuery<
    FetchResult<{ tags: TagSearchOption[] }>,
    Error
  >({
    queryKey: ["tags", debouncedValue, field.value],
    queryFn: async () =>
      fetcher(apiPath, {
        action: "tags",
        name: adminName,
        keywords: debouncedValue,
        exclude: field.value,
      }),
    placeholderData: keepPreviousData,
    enabled: focusing,
  });

  const tags = data?.status === "success" ? data.tags : [];
  const open =
    focusing && !isPending && data?.status === "success" && !!tags.length;

  function addTag(tag: TagSearchOption) {
    const newTag = { name: tag.name, slug: tag.slug };
    field.onChange(
      [...field.value, newTag].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setKeywords("");
    setHighlightedTag(null);
    inputRef.current?.focus();
  }

  function addTypedTags() {
    const newTags = keywords
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((name) => ({ name, slug: kebabCase(name).trim() }))
      .filter(
        (tag, index, values) =>
          tag.slug.length > 0 &&
          !field.value.some((value: Tag) => value.slug === tag.slug) &&
          values.findIndex((value) => value.slug === tag.slug) === index,
      );

    if (newTags.length) {
      field.onChange(
        [...field.value, ...newTags].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    }

    setKeywords("");
    setHighlightedTag(null);
  }

  return (
    <Combobox<TagSearchOption>
      items={tags}
      open={open}
      inputValue={keywords}
      filter={null}
      autoHighlight
      itemToStringLabel={(tag) => tag.name}
      itemToStringValue={(tag) => tag.slug}
      isItemEqualToValue={(item, currentValue) =>
        item.slug === currentValue.slug
      }
      onInputValueChange={(value) => {
        setKeywords(value);
        setHighlightedTag(null);
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFocusing(false);
          setHighlightedTag(null);
        }
      }}
      onItemHighlighted={(tag) => {
        setHighlightedTag(tag ?? null);
      }}
      onValueChange={(tag) => {
        if (tag) {
          addTag(tag);
        }
      }}
    >
      <div className="relative flex items-center">
        <TagIcon className="pointer-events-none absolute left-0 z-10 size-6 text-gray-600" />
        <ComboboxInput
          className="w-full rounded-none border-0 border-b"
          inputClassName="pl-10"
          placeholder="Enter tag"
          ref={inputRef}
          showTrigger={false}
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !highlightedTag && keywords.length) {
              event.preventDefault();
              addTypedTags();
            }
          }}
          onFocus={() => {
            setFocusing(true);
          }}
        />
      </div>

      <ComboboxContent className="p-0" sideOffset={0}>
        {(() => {
          if (error) {
            return <Alert>{error.message}</Alert>;
          }

          if (!focusing || isPending || !data) {
            return (
              <div className="py-12">
                <Progress className="size-12" />
              </div>
            );
          }

          if (data.status === "error") {
            return <Alert>{data.message}</Alert>;
          }

          return (
            <>
              <ComboboxEmpty>No tags found.</ComboboxEmpty>
              <ComboboxList>
                {(tag: TagSearchOption) => (
                  <ComboboxItem
                    key={tag.slug}
                    className="block cursor-pointer"
                    value={tag}
                  >
                    <div className="flex justify-between">
                      <span>{tag.name}</span> <span>{tag.count}</span>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </>
          );
        })()}
      </ComboboxContent>
    </Combobox>
  );
}
