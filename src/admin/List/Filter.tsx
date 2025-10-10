"use client";

import { useState, useEffect } from "react";

import * as React from "react";
import { Funnel, ChevronDown } from "lucide-react";
import Form from "@kenstack/forms/Form";

import { Button } from "@kenstack/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";

import { useAdminList } from "./context";
let timeout = null;

const Filter: React.FC = () => {
  // const { getValues } = useFormContext();
  const [open, setOpen] = useState(false);
  const { adminConfig, filters: filterStore, setFilters } = useAdminList();
  const [hydrated, setHydrated] = useState(false);
  // const [state, setState, hydrated] = usePersistedState(
  //   "admin-filters",
  //   adminConfig.filters ? adminConfig.filters.defaultValues : {}
  // );

  const value = [];
  useEffect(() => {
    setHydrated(true);
  }, []);

  const filters = adminConfig.filters;
  if (!hydrated || !filters) {
    return null;
  }
  // console.log("foo", state);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          // className=""
        >
          <Funnel fill={value.length ? "#aaa" : "none"} />
          Filter
          <ChevronDown
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <Form
          schema={filters.schema}
          defaultValues={filterStore.filters}
          onSubmit={() => {}}
          onChange={({ form }) => {
            if (timeout) {
              clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
              setFilters({ ...filterStore, filters: form.getValues() });
            }, 500);
          }}
        >
          <FilterBody />
        </Form>
      </PopoverContent>
    </Popover>
  );
};

const FilterBody: React.FC = () => {
  // const { watch } = useFormContext();
  // const values = watch();

  // const firstRender = React.useRef(false);
  // React.useEffect(() => {
  //   if (!firstRender.current) {
  //     firstRender.current = true;
  //     return;
  //   }
  //   console.log(values);
  //   setState(values);
  // }, [values]);

  const { adminConfig } = useAdminList();
  const Filters = adminConfig.filters.Filters;

  return <Filters />;
};

export default Filter;
