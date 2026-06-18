"use client";

import { format } from "date-fns";
import { parseDate } from "chrono-node";
import {
  CalendarIcon,
  ListFilter,
  RotateCcw,
  X,
} from "lucide-react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

import { Button } from "@kenstack/components/Button";
import { Calendar } from "@kenstack/components/Calendar";
import { Input } from "@kenstack/forms/controls/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { Checkbox } from "@kenstack/forms/controls/Checkbox";
import { Separator } from "@kenstack/components/Separator";
import type { AdminFilterMeta } from "@kenstack/admin/types/list";
import Tooltip from "@kenstack/components/Tooltip";
import { cn } from "@kenstack/lib/utils";
import type { ListQueryStoreState } from "@kenstack/list/querySchema";
import type { SetQueryStore } from "@kenstack/list/useQueryStore";

type FilterValue =
  | string
  | boolean
  | OptionFilterValue
  | {
      from?: string;
      to?: string;
    };

type OptionFilterState = "+" | "-";
type OptionFilterValue = Record<string, OptionFilterState>;

export default function FilterControl({
  filter,
  filters,
  setFilters,
  showLabel = false,
  tooltip = true,
}: {
  filter: AdminFilterMeta[];
  filters: ListQueryStoreState;
  setFilters: SetQueryStore<ListQueryStoreState>;
  showLabel?: boolean;
  tooltip?: boolean;
}) {
  const [selectedFilterNames, setSelectedFilterNames] = useState<string[]>([]);
  const filterOptions = filter.filter(
    (option) => filters.trash || option.name !== "deletedAt",
  );
  const activeFilters = useMemo(
    () =>
      filterOptions.filter((option) =>
        isActiveFilterValue(filters.filters[option.name]),
      ),
    [filterOptions, filters.filters],
  );
  const selectedFilters = useMemo(
    () =>
      filterOptions.filter(
        (option) =>
          selectedFilterNames.includes(option.name) ||
          activeFilters.some(
            (activeFilter) => activeFilter.name === option.name,
          ),
      ),
    [activeFilters, filterOptions, selectedFilterNames],
  );

  if (!filterOptions.length) {
    return null;
  }

  const activeCount = activeFilters.length;
  const hasSelectedFilters = selectedFilters.length > 0;
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "default" : "icon"}
        className={cn("relative text-gray-800", showLabel ? "gap-2" : "")}
        aria-label="Filters"
      >
        <ListFilter className={showLabel ? "size-4" : "size-6"} />
        {showLabel ? <span>Filters</span> : null}
        {activeCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-fuchsia-800 text-[10px] font-medium text-white">
            {activeCount}
          </span>
        ) : null}
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover>
      {tooltip ? <Tooltip content="Filters">{trigger}</Tooltip> : trigger}
      <PopoverContent align="end" className="w-80 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-800">Filters</div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={
                "gap-1 " +
                (hasSelectedFilters
                  ? ""
                  : "pointer-events-none invisible select-none")
              }
              aria-hidden={!hasSelectedFilters}
              tabIndex={hasSelectedFilters ? undefined : -1}
              onClick={() => {
                setSelectedFilterNames([]);
                setFilters((prev) => ({ ...prev, filters: {} }), false);
              }}
            >
              <RotateCcw className="size-3" />
              Clear
            </Button>
          </div>

          {selectedFilters.length > 0 ? (
            <div className="flex flex-col gap-3">
              {selectedFilters.map((option) => (
                <div
                  key={option.name}
                  className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-2"
                >
                  <FilterHeading
                    label={option.label}
                    onRemove={() =>
                      removeFilter(
                        option.name,
                        setFilters,
                        setSelectedFilterNames,
                      )
                    }
                  />
                  <FilterEditor
                    option={option}
                    value={filters.filters[option.name]}
                    onChange={(value, debounce) =>
                      setFilterValue(option.name, value, setFilters, debounce)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No active filters.</div>
          )}

          <Separator />
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Add Filter
            </div>
            <div className="grid grid-cols-2 gap-1">
              {filterOptions
                .filter(
                  (option) =>
                    !selectedFilters.some(
                      (selectedFilter) => selectedFilter.name === option.name,
                    ),
                )
                .map((option) => (
                  <Button
                    key={option.name}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      addFilter(
                        option.name,
                        option.kind,
                        setFilters,
                        setSelectedFilterNames,
                      );
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterEditor({
  option,
  value,
  onChange,
}: {
  option: AdminFilterMeta;
  value: unknown;
  onChange: (value: FilterValue | null, debounce?: boolean) => void;
}) {
  if (option.kind === "date-range") {
    const range =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { from?: string; to?: string })
        : {};

    return (
      <div className="grid grid-cols-2 gap-2">
        <DateFilterInput
          aria-label={`${option.label} from`}
          placeholder="From"
          value={range.from ?? ""}
          onChange={(event) =>
            onChange(compactRange({ ...range, from: event }))
          }
        />
        <DateFilterInput
          aria-label={`${option.label} to`}
          placeholder="To"
          value={range.to ?? ""}
          onChange={(event) => onChange(compactRange({ ...range, to: event }))}
        />
      </div>
    );
  }

  if (option.kind === "boolean") {
    return (
      <div className="flex gap-1">
        <Button
          type="button"
          variant={value === true ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant={value === false ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    );
  }

  if (option.kind === "enum" || option.kind === "includes") {
    const selected = parseOptionFilterValue(value);

    return (
      <div className="flex max-h-56 flex-col gap-2 overflow-auto pr-1">
        {option.options?.map((item) => {
          const state = selected[item.value];
          const optionId = `filter-${option.name}-${item.value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

          return (
            <div
              key={item.value}
              className="flex items-center gap-2 text-sm text-gray-800"
            >
              <FilterOptionCheckbox
                id={optionId}
                checked={state === "-" ? "indeterminate" : state === "+"}
                aria-label={`${item.label}: ${formatOptionState(state)}`}
                onCheckedChange={() =>
                  onChange(cycleOptionState(selected, item.value))
                }
              />
              <label className="cursor-pointer" htmlFor={optionId}>
                <span
                  className={
                    state === "-"
                      ? "line-through decoration-fuchsia-800 decoration-2"
                      : undefined
                  }
                >
                  {item.label}
                </span>
                {item.description ? (
                  <span className="block text-xs text-gray-500">
                    {item.description}
                  </span>
                ) : null}
              </label>
            </div>
          );
        })}
      </div>
    );
  }

  return <TextFilterInput value={value} onChange={onChange} />;
}

function FilterHeading({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function FilterOptionCheckbox({
  className,
  ...props
}: ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      className={cn(
        "data-[state=indeterminate]:border-fuchsia-800 data-[state=indeterminate]:bg-fuchsia-800 data-[state=indeterminate]:text-white",
        className,
      )}
      {...props}
    />
  );
}

function DateFilterInput({
  value,
  onChange,
  placeholder,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [textValue, setTextValue] = useState(formatDateValue(value));
  const [previousValue, setPreviousValue] = useState(value);
  const [open, setOpen] = useState(false);

  if (value !== previousValue) {
    setPreviousValue(value);
    setTextValue(formatDateValue(value));
  }

  const date = parseStoredDate(value);

  const commitDate = (nextValue: string | Date) => {
    if (!nextValue) {
      onChange("");
      setTextValue("");
      return;
    }

    const parsedDate =
      nextValue instanceof Date ? nextValue : (parseDate(nextValue) ?? null);

    if (parsedDate) {
      onChange(parsedDate.toISOString());
      setTextValue(format(parsedDate, "MMMM d, yyyy"));
      return;
    }

    setTextValue(formatDateValue(value));
  };

  return (
    <div className="relative flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-0 z-10 size-8"
          >
            <CalendarIcon className="size-4" />
            <span className="sr-only">Pick a date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              commitDate(selectedDate ?? "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        {...props}
        placeholder={placeholder}
        className="pl-8 text-sm"
        value={textValue}
        onChange={(event) => setTextValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDate(textValue);
          }
        }}
        onBlur={() => commitDate(textValue)}
      />
    </div>
  );
}

function TextFilterInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: FilterValue | null, debounce?: boolean) => void;
}) {
  const externalValue = typeof value === "string" ? value : "";
  const [textValue, setTextValue] = useState(externalValue);
  const [previousValue, setPreviousValue] = useState(externalValue);

  if (externalValue !== previousValue) {
    setPreviousValue(externalValue);
    setTextValue(externalValue);
  }

  return (
    <Input
      placeholder="Use - to exclude"
      value={textValue}
      onChange={(event) => {
        const nextValue = event.target.value;
        setTextValue(nextValue);
        onChange(nextValue, true);
      }}
    />
  );
}

function setFilterValue(
  name: string,
  value: FilterValue | null,
  setFilters: SetQueryStore<ListQueryStoreState>,
  debounce = false,
) {
  setFilters((prev) => {
    const nextFilters = { ...prev.filters };
    if (isActiveFilterValue(value)) {
      nextFilters[name] = value;
    } else {
      delete nextFilters[name];
    }

    return { ...prev, filters: nextFilters };
  }, debounce);
}

function addFilter(
  name: string,
  kind: string,
  setFilters: SetQueryStore<ListQueryStoreState>,
  setSelectedFilterNames: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedFilterNames((prev) =>
    prev.includes(name) ? prev : [...prev, name],
  );
  if (kind !== "boolean") {
    return;
  }

  setFilters(
    (prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [name]: getInitialValue(kind),
      },
    }),
    false,
  );
}

function removeFilter(
  name: string,
  setFilters: SetQueryStore<ListQueryStoreState>,
  setSelectedFilterNames: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedFilterNames((prev) => prev.filter((item) => item !== name));
  setFilters((prev) => {
    const nextFilters = { ...prev.filters };
    delete nextFilters[name];
    return { ...prev, filters: nextFilters };
  }, false);
}

function isActiveFilterValue(value: unknown) {
  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const range = value as { from?: unknown; to?: unknown };
  if (range.from || range.to) {
    return true;
  }

  return Object.values(value).some((item) => item === "+" || item === "-");
}

function getInitialValue(kind: string) {
  if (kind === "boolean") {
    return true;
  }

  if (kind === "date-range" || kind === "enum" || kind === "includes") {
    return {};
  }

  return "";
}

function compactRange(range: { from?: string; to?: string }) {
  const next = {
    from: range.from || undefined,
    to: range.to || undefined,
  };

  return next.from || next.to ? next : null;
}

function parseOptionFilterValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, OptionFilterState] =>
        entry[1] === "+" || entry[1] === "-",
    ),
  ) satisfies OptionFilterValue;
}

function cycleOptionState(selected: OptionFilterValue, value: string) {
  const next = { ...selected };
  if (!next[value]) {
    next[value] = "+";
  } else if (next[value] === "+") {
    next[value] = "-";
  } else {
    delete next[value];
  }

  return next;
}

function formatOptionState(state: OptionFilterState | undefined) {
  if (state === "+") {
    return "included";
  }

  if (state === "-") {
    return "excluded";
  }

  return "ignored";
}

function parseStoredDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateValue(value: string) {
  const date = parseStoredDate(value);
  return date ? format(date, "MMMM d, yyyy") : value;
}
