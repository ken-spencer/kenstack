"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Form from "@kenstack/forms/Form";
import fetcher from "@kenstack/api/fetcher";

import { useAdminEdit } from "./context";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getOneToOneQueryKey } from "./queryKey";
import { isRecord } from "@kenstack/lib/isRecord";

// Renders the admin edit form and connects saving to admin routing and cached state.
export default function EditForm({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    defaultValues,
    schema,
    isNew,
    id,
    single,
    apiPath,
    name,
    parentId,
    userId,
    oneToOne,
  } = useAdminEdit();
  const revisionTarget = single ? name : id;
  const basePathname = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }, [pathname]);
  return (
    <Form
      guardUnsaved
      validationMessage="We couldn't save your changes. Check the highlighted fields below for more information."
      schema={schema}
      defaultValues={defaultValues}
      apiPath={apiPath}
      mutationFn={async ({ changes, values }) => {
        return fetcher<{ id: number; values: Record<string, unknown> }>(
          apiPath,
          {
            action: "save",
            name,
            id,
            isNew,
            parentId,
            changes,
            values,
          },
        );
      }}
      onSuccess={(data, variables, { form }) => {
        queryClient.invalidateQueries({ queryKey: ["admin-list"] });
        queryClient.invalidateQueries({ queryKey: ["relationship-search"] });
        queryClient.invalidateQueries({ queryKey: ["relationship-selected"] });
        queryClient.removeQueries({
          queryKey: ["admin-edit", name, revisionTarget, "revisions"],
          exact: true,
        });
        const recordId = data.id ?? id;
        const savedValues = data.values ?? defaultValues;
        if (recordId && oneToOne) {
          const savedRelation = oneToOne.relations.find(({ name }) =>
            Object.hasOwn(savedValues, name),
          );
          if (savedRelation) {
            const relationValues = savedValues[savedRelation.name];
            queryClient.setQueryData(
              getOneToOneQueryKey({
                name,
                parentId: recordId,
                relationKey: savedRelation.name,
              }),
              relationValues,
            );
          }
        }

        if (name === "users" && recordId === userId) {
          router.refresh();
        }

        // Next preserves the new-entry route with Activity. Clear every
        // completed create before a save action stays, returns, or moves on.
        if (isNew) {
          form.reset(defaultValues);
        }

        if (
          typeof variables.submitter === "string" &&
          variables.submitter.startsWith("/")
        ) {
          const currentPath =
            pathname + (searchParams.size ? "?" + searchParams : "");

          if (variables.submitter === currentPath) {
            if (!isNew) {
              let resetValues = savedValues;
              if (oneToOne) {
                const selection =
                  savedValues[oneToOne.field] ?? form.getValues(oneToOne.field);
                const activeRelation = oneToOne.relations.find(
                  ({ value }) => value === selection,
                );
                if (
                  activeRelation &&
                  !Object.hasOwn(savedValues, activeRelation.name)
                ) {
                  const relationValues = form.getValues(activeRelation.name);
                  if (isRecord(relationValues)) {
                    resetValues = {
                      ...savedValues,
                      [activeRelation.name]: relationValues,
                    };
                  }
                }
              }
              form.reset(resetValues);
            }
          } else {
            router.push(variables.submitter);
          }
        } else if (isNew) {
          router.push(
            (parentId
              ? `/admin/${name}/${data.id}`
              : basePathname + "/" + data.id) +
              (searchParams.size ? "?" + searchParams : ""),
          );
        }
      }}
      onSubmit={({ data, mutation, event, changes }) => {
        const submitter =
          event?.nativeEvent instanceof SubmitEvent
            ? event.nativeEvent.submitter
            : null;
        const button =
          submitter instanceof HTMLButtonElement ? submitter : null;
        const values = { ...data };
        if (oneToOne) {
          for (const relation of oneToOne.relations) {
            if (!changes.includes(relation.name)) {
              delete values[relation.name];
            }
          }
        }

        return mutation.mutateAsync({
          changes,
          submitter: button?.name === "action" ? button.value : undefined,
          values,
        });
      }}
    >
      {children}
    </Form>
  );
}
