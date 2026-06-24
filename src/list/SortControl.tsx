"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@kenstack/components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import Tooltip from "@kenstack/components/Tooltip";
import type { AdminSortMeta, SortDirection } from "@kenstack/admin/types/list";
import type { ListQueryStoreState } from "@kenstack/list/querySchema";
import type { SetQueryStore } from "@kenstack/list/useQueryStore";

export default function SortControl({
  filters,
  label,
  setFilters,
  showLabel = false,
  sort,
  tooltip = true,
}: {
  filters: ListQueryStoreState;
  label?: string;
  setFilters: SetQueryStore<ListQueryStoreState>;
  showLabel?: boolean;
  sort: AdminSortMeta[];
  tooltip?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortOptions = sort.filter(
    (option) => filters.trash || option.name !== "deletedAt",
  );
  const currentSort =
    sortOptions.find((option) => option.name === filters.sort) ??
    sortOptions[0];

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 1000);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  if (!currentSort || sortOptions.length === 0) {
    return null;
  }

  const direction = filters.direction;
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-2 text-gray-800"
        aria-label={`Sort by ${currentSort.label}`}
      >
        <ArrowUpDown className="size-5" />
        <span className={showLabel ? "inline" : "hidden sm:inline"}>
          {label ?? currentSort.label}
        </span>
        {currentSort.direction !== false ? (
          <DirectionIcon
            direction={direction}
            className={showLabel ? "block size-4" : "hidden sm:block"}
          />
        ) : null}
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          clearCloseTimer();
        }
        setOpen(nextOpen);
      }}
    >
      {tooltip ? <Tooltip content="Sort">{trigger}</Tooltip> : trigger}
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex flex-col gap-1">
          {sortOptions.map((option) => {
            const isSelected = option.name === currentSort.name;
            const optionDirection = isSelected
              ? direction
              : option.defaultDirection;

            return (
              <button
                type="button"
                key={option.name}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-800 transition hover:bg-gray-100"
                onClick={() => {
                  setFilters(
                    (prev) => ({
                      ...prev,
                      sort: option.name,
                      direction: option.direction === false
                        ? option.defaultDirection
                        : isSelected
                          ? flipDirection(prev.direction)
                          : option.defaultDirection,
                    }),
                    false,
                  );
                  scheduleClose();
                }}
              >
                <span className="flex size-4 items-center justify-center">
                  {isSelected ? <Check className="size-4" /> : null}
                </span>
                <span className="grow">{option.label}</span>
                {option.direction !== false ? (
                  <DirectionIcon direction={optionDirection} />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DirectionIcon({
  direction,
  className,
}: {
  direction: SortDirection;
  className?: string;
}) {
  return direction === "asc" ? (
    <ArrowUp className={className ?? "size-4"} />
  ) : (
    <ArrowDown className={className ?? "size-4"} />
  );
}

function flipDirection(direction: SortDirection) {
  return direction === "asc" ? "desc" : "asc";
}
