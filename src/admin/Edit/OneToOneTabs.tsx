"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";

import fetcher from "@kenstack/api/fetcher";
import Alert from "@kenstack/components/Alert";
import { Skeleton } from "@kenstack/components/Skeleton";
import { isRecord } from "@kenstack/lib/isRecord";
import { useAdminEdit, type OneToOneEdit } from "./context";
import { getOneToOneQueryKey } from "./queryKey";

// Renders the standard edit form or relation tabs according to the module configuration.
export default function OneToOneTabs() {
  const { client, oneToOne } = useAdminEdit();
  if (!oneToOne || !oneToOne.relations.length) {
    return <client.EditForm />;
  }

  return <TabSet oneToOne={oneToOne} />;
}

// Renders relation tabs and handles switching so each field set appears as a separate section.
function TabSet({ oneToOne }: { oneToOne: OneToOneEdit }) {
  const { control, getFieldState, unregister, setValue } = useFormContext();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectionValue = useWatch({
    control,
    name: oneToOne.field,
  });

  const activeRelation = oneToOne.relations.find(
    ({ value }) => value === selectionValue,
  );
  const panels = oneToOne.relations;
  const selectPanel = (nextRelation: OneToOneEdit["relations"][number]) => {
    if (nextRelation.name === activeRelation?.name) {
      return;
    }

    if (
      activeRelation &&
      getFieldState(activeRelation.name).isDirty &&
      !window.confirm(
        `Discard unsaved ${activeRelation.title} changes and switch to ${nextRelation.title}?`,
      )
    ) {
      return;
    }

    if (activeRelation) {
      unregister(activeRelation.name, { keepDefaultValue: true });
    }
    setValue(oneToOne.field, nextRelation.value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };
  const navigateTabs = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % panels.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + panels.length) % panels.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = panels.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      tabRefs.current[nextIndex]?.focus();
      selectPanel(panels[nextIndex]);
    }
  };

  return (
    <div className="space-y-6">
      {!activeRelation ? (
        <Alert>
          The saved related type is unavailable. Choose a related type to repair
          this record.
        </Alert>
      ) : null}
      <div
        aria-label="Record sections"
        className="mb-5 flex gap-1 border-b border-b-[var(--admin-divider)]"
        role="tablist"
      >
        {panels.map((panel, index) => {
          const selected = panel.name === activeRelation?.name;

          return (
            <button
              key={panel.name}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              aria-controls={`admin-panel-${panel.name}`}
              aria-selected={selected}
              className={
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
                (selected
                  ? "text-foreground border-blue-500"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:border-gray-500")
              }
              id={`admin-tab-${panel.name}`}
              role="tab"
              tabIndex={selected || (!activeRelation && index === 0) ? 0 : -1}
              type="button"
              onClick={() => {
                selectPanel(panel);
              }}
              onKeyDown={(event) => {
                navigateTabs(event, index);
              }}
            >
              {panel.title}
            </button>
          );
        })}
      </div>

      {activeRelation ? (
        <div
          aria-labelledby={`admin-tab-${activeRelation.name}`}
          id={`admin-panel-${activeRelation.name}`}
          role="tabpanel"
        >
          <Panel relation={activeRelation} />
        </div>
      ) : null}
    </div>
  );
}

// Renders the active relation form and loads its values without adding inactive sections to form
// state.
function Panel({ relation }: { relation: OneToOneEdit["relations"][number] }) {
  const { getFieldState, getValues, resetField, setValue } = useFormContext();
  const { apiPath, client, id, isNew, name } = useAdminEdit();
  const relationQuery = useQuery({
    enabled: Boolean(id && !isNew),
    queryKey: getOneToOneQueryKey({
      name,
      parentId: id ?? 0,
      relationKey: relation.name,
    }),
    staleTime: "static",
    queryFn: async () => {
      if (!id) {
        throw new Error("This related panel is unavailable.");
      }

      const result = await fetcher<{
        item: Record<string, unknown> | null;
      }>(apiPath, {
        action: "load-one-to-one",
        name,
        parentId: id,
        relationKey: relation.name,
      });

      if (result.status === "error") {
        throw new Error(result.message ?? "Unable to load related details.");
      }

      return result.item;
    },
  });

  useEffect(() => {
    let relationValues = relation.defaultValues;
    if (!isNew && id) {
      if (relationQuery.data === undefined) {
        return;
      }
      relationValues = relationQuery.data ?? relation.defaultValues;
    }

    if (getFieldState(relation.name).isDirty) {
      const restoredValues = getValues(relation.name);
      if (isRecord(restoredValues)) {
        setValue(
          relation.name,
          { ...relationValues, ...restoredValues },
          { shouldDirty: true },
        );
      }
      return;
    }
    resetField(relation.name, {
      defaultValue: relationValues,
      keepError: false,
      keepDirty: false,
      keepTouched: false,
    });
  }, [
    getFieldState,
    getValues,
    id,
    isNew,
    relation,
    relationQuery.data,
    resetField,
    setValue,
  ]);

  if (relationQuery.error) {
    return <Alert>{relationQuery.error.message}</Alert>;
  }

  if (!isNew && id && relationQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const EditForm = client.oneToOne?.[relation.name];
  if (!EditForm) {
    return (
      <Alert>This related panel does not have an edit form configured.</Alert>
    );
  }

  return <EditForm ParentEditForm={client.EditForm} />;
}
