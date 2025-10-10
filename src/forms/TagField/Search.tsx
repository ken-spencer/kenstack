import { useState, useRef } from "react";

import { Tag } from "lucide-react";
import Progress from "@kenstack/components/Progress";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Alert from "@kenstack/components/Alert";
import fetcher, { type FetchResult } from "@kenstack/lib/fetcher";
import { useForm } from "@kenstack/forms/context";
import useDebounce from "@kenstack/hooks/useDebounce";
import { Input } from "@kenstack/components/ui/input";

import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@kenstack/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";

type Tags = {
  count: number;
  name: string;
  slug: string;
};

export default function TagSearcht({ field }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const [keywords, debouncedValue, setKeywords] = useDebounce();
  const [focusing, setFocusing] = useState(false);
  const [commandValue, setCommandValue] = useState("no-value");
  // const setKeywords = useCallback(
  //   (v) => {
  //     setKeywordsBase(v);
  //     setCommandValue("no-value");
  //   },
  //   [setKeywordsBase]
  // );

  // const [keywords, debouncedKeywords, setKeywords] = useDebounce("", 500);
  const { apiPath } = useForm();

  const { data, error, isPending } = useQuery<
    FetchResult<{ tags: Tags[] }>,
    Error
  >({
    queryKey: ["tags", debouncedValue, field.value],
    queryFn: async () =>
      fetcher(apiPath + "/tags", {
        keywords: debouncedValue,
        exclude: field.value,
      }),
    placeholderData: keepPreviousData,
    enabled: focusing,
  });

  return (
    <Popover
      open={
        focusing &&
        !isPending &&
        data.status === "success" &&
        !!data.tags.length
      }
    >
      <Command
        value={commandValue}
        onValueChange={(v) => {
          if (v !== "no-value") {
            setCommandValue(v);
          }
        }}
        shouldFilter={false} // disable built-in filtering
      >
        <PopoverTrigger asChild>
          <div className="flex items-center">
            <Tag className="text-gray-600 size-6" />
            <Input
              // className="flex-1 min-w-36 p-0 appearance-none border-none  bg-transparent focus:outline-none focus:ring-0"
              className="-ml-9 pl-10 border-0 border-b rounded-none"
              placeholder="Enter tag"
              value={keywords}
              ref={inputRef}
              autoComplete="off"
              onKeyDown={(evt) => {
                if (evt.key === "Enter" && keywords.length) {
                  evt.preventDefault();
                  // avoid duplication
                  const slug = keywords
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "");

                  if (field.value.some((v) => v.slug === slug)) {
                    setKeywords("");
                    setCommandValue("no-value");

                    return;
                  }
                  const newValue = [
                    ...field.value,
                    { name: keywords.trim(), slug },
                  ].sort((a, b) => a.name.localeCompare(b.name));
                  field.onChange(newValue);
                  setKeywords("");
                  setCommandValue("no-value");
                }
              }}
              onChange={(evt) => {
                setKeywords(evt.target.value);
                setCommandValue("no-value");
              }}
              onFocus={() => {
                setFocusing(true);
              }}
              onBlur={(evt) => {
                const d = dialogRef.current;
                if (!d || !d.contains(evt.relatedTarget)) {
                  setFocusing(false);
                }
                // delay to give enough time to click on the dialog before removing it.
                setTimeout(() => {}, 50);
              }}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="m-0 w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(e) => {
            // prevent the Popover from moving focus into itself
            e.preventDefault();
          }}
        >
          {(() => {
            if (error) {
              return <Alert>{error.message}</Alert>;
            }

            if (focusing === false || isPending) {
              return (
                <div className="py-12">
                  <Progress className="size-12" />
                </div>
              );
            }

            if ("error" === data.status) {
              return <Alert>{data.message}</Alert>;
            }

            return (
              <CommandList ref={dialogRef}>
                <CommandEmpty>No tags found.</CommandEmpty>

                <div>
                  {data.tags.map(({ count, ...tag }) => (
                    <CommandItem
                      key={tag.name}
                      className="block cursor-pointer"
                      value={tag.slug}
                      onSelect={(v) => {
                        const newValue = [...field.value, tag].sort((a, b) =>
                          a.name.localeCompare(b.name)
                        );

                        field.onChange(newValue);
                        inputRef.current.focus();
                        setKeywords("");
                      }}
                    >
                      <div className="flex justify-between">
                        <span>{tag.name}</span> <span>{count}</span>
                      </div>
                    </CommandItem>
                  ))}
                </div>
              </CommandList>
            );
          })()}
        </PopoverContent>
      </Command>
    </Popover>
  );
}
