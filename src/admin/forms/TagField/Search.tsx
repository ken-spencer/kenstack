import { useRef, useState } from "react";

import { Tag as TagIcon } from "lucide-react";
import { Skeleton } from "@kenstack/components/Skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Alert from "@kenstack/components/Alert";
import fetcher from "@kenstack/api/fetcher";
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
import type { SelectOption } from "@kenstack/forms/controls/Select";

import type { Tag } from "./types";
import { type AnyField } from "@kenstack/forms/types";

type TagSearchOption = Tag & SelectOption;

export default function TagSearcht({ field }: { field: AnyField }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keywords, debouncedValue, setKeywords] = useDebounce();
  const [focusing, setFocusing] = useState(false);
  const [highlightedTag, setHighlightedTag] = useState<TagSearchOption | null>(
    null,
  );
  const { apiPath, name: adminName } = useAdminEdit();

  const { data, error, isPending } = useQuery({
    queryKey: ["tags", debouncedValue, field.value],
    queryFn: async () => {
      const result = await fetcher<{ tags: Tag[] }>(apiPath, {
        action: "tags",
        name: adminName,
        keywords: debouncedValue,
        exclude: field.value,
      });

      if (result.status === "error") {
        return result;
      }

      return {
        ...result,
        tags: result.tags.map((tag) => ({
          ...tag,
          label: tag.name,
          value: tag.slug,
        })),
      };
    },
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
    <Combobox
      items={tags}
      open={open}
      inputValue={keywords}
      filter={null}
      autoHighlight
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
      onValueChange={(_value, tag) => {
        if (tag) {
          addTag(tag);
        }
      }}
    >
      <div className="relative flex items-center">
        <TagIcon className="text-muted-foreground pointer-events-none absolute left-0 z-10 size-6" />
        <ComboboxInput
          className="w-full rounded-none border-0 border-b"
          inputClassName="pl-10"
          placeholder="Enter tag"
          ref={inputRef}
          showChevron={false}
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

      <ComboboxContent className="mt-0 p-0">
        {(() => {
          if (error) {
            return <Alert>{error.message}</Alert>;
          }

          if (!focusing || isPending || !data) {
            return (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-5/6" />
                <Skeleton className="h-8 w-2/3" />
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
                      <span>{tag.label}</span> <span>{tag.count}</span>
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
