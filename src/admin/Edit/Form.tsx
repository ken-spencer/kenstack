import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Form from "@kenstack/forms/Form";
import fetcher from "@kenstack/api/fetcher";

import { useAdminEdit } from "./context";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AdminEditForm({
  children,
}: {
  children: React.ReactNode;
}) {
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
  } = useAdminEdit();
  const loadTarget = single ? name : id;
  const basePathname = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }, [pathname]);

  return (
    <Form
      key={`${name}:${single ? "single" : isNew ? "new" : id}`}
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
        queryClient.removeQueries({
          queryKey: ["admin-edit", name, loadTarget, "revisions"],
          exact: true,
        });

        if (name === "users" && (data.id ?? id) === userId) {
          router.refresh();
        }

        if (
          typeof variables.submitter === "string" &&
          variables.submitter.startsWith("/")
        ) {
          const currentPath =
            pathname + (searchParams.size ? "?" + searchParams : "");

          if (variables.submitter === currentPath) {
            form.reset(data.values ?? defaultValues);
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
        const button = (event?.nativeEvent as SubmitEvent)
          ?.submitter as HTMLButtonElement;
        return mutation.mutateAsync({
          changes,
          submitter: button?.name === "action" ? button.value : undefined,
          values: data,
        });
      }}
    >
      {children}
    </Form>
  );
}
