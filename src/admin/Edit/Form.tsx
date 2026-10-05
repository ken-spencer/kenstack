"use client";

import { useQueryClient } from "@tanstack/react-query";
import pick from "lodash-es/pick";
import Form from "@kenstack/forms/Form";
import fetcher from "@kenstack/api/fetcher";
import { refreshUserInfo } from "@kenstack/auth/useUserInfo";

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
  return (
    <Form
      guardUnsaved
      validationMessage="We couldn't save your changes. Check the highlighted fields below for more information."
      schema={schema}
      defaultValues={defaultValues}
      apiPath={apiPath}
      mutationFn={async ({ changes, values, id: recordId, updatedAt }) => {
        return fetcher<{
          id: number;
          values: Record<string, unknown>;
          updatedAt: string | null;
        }>(apiPath, {
          action: "save",
          name,
          id: recordId,
          updatedAt,
          isNew,
          parentId,
          changes,
          values,
        });
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
        if (!isNew) {
          // The token comes with the values it covers: a save that merged someone else's changes
          // returns the whole record, so the whole baseline moves with it, including fields the
          // form never rendered. The baseline covers the fields the form holds, so a relation it
          // set aside stays out. An edit made while the save ran to a field it did not return is
          // applied again over the new baseline, so it stays unsaved and every saved field is clean.
          const pending = pick(
            form.getValues(),
            Object.keys(form.formState.dirtyFields).filter(
              (key) => !Object.hasOwn(savedValues, key),
            ),
          );
          form.reset(
            {
              ...pick(
                form.formState.defaultValues,
                Object.keys(form.getValues()),
              ),
              ...savedValues,
              updatedAt: data.updatedAt,
            },
            { keepFieldsRef: true },
          );
          for (const [key, value] of Object.entries(pending)) {
            form.setValue(key, value, { shouldDirty: true });
          }
        }
        if (recordId && oneToOne) {
          // A cached relation is as of the token it was loaded with. The save returns the live one,
          // or nothing when it has no row yet; any other loads again when its panel opens.
          for (const relation of oneToOne.relations) {
            const queryKey = getOneToOneQueryKey({
              name,
              parentId: recordId,
              relationKey: relation.name,
            });
            if (relation.value === savedValues[oneToOne.field]) {
              queryClient.setQueryData(
                queryKey,
                savedValues[relation.name] ?? null,
              );
            } else {
              queryClient.removeQueries({ queryKey, exact: true });
            }
          }
        }

        if (name === "users" && recordId === userId) {
          void refreshUserInfo();
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

          if (variables.submitter !== currentPath) {
            router.push(variables.submitter);
          }
        } else if (isNew) {
          router.push(
            `/admin/${name}/${data.id}` +
              (searchParams.size ? "?" + searchParams : ""),
          );
        }
      }}
      onSubmit={({ data, mutation, event, changes, form }) => {
        const submitter =
          event?.nativeEvent instanceof SubmitEvent
            ? event.nativeEvent.submitter
            : null;
        const button =
          submitter instanceof HTMLButtonElement ? submitter : null;
        const values = { ...data };
        let saveChanges = changes;
        if (oneToOne) {
          for (const relation of oneToOne.relations) {
            if (!changes.includes(relation.name)) {
              delete values[relation.name];
            }
          }
          // A relation's changes go as its dirty subfields, so the save writes only those.
          saveChanges = changes.flatMap((key) => {
            const dirty = form.formState.dirtyFields[key];
            return oneToOne.relations.some(({ name }) => name === key) &&
              isRecord(dirty)
              ? Object.keys(dirty).map((subfield) => `${key}.${subfield}`)
              : [key];
          });
        }

        return mutation.mutateAsync({
          changes: saveChanges,
          submitter: button?.name === "action" ? button.value : undefined,
          values,
          // The record as this form last loaded or saved it, which the save compares against; a
          // singleton learns its id from its first save. The form's values hold both, beside the
          // fields, and the reset after a save moves them on.
          id: form.getValues("id"),
          updatedAt: form.getValues("updatedAt") ?? null,
        });
      }}
    >
      {children}
    </Form>
  );
}
