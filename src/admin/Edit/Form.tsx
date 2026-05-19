import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
// import FormContainer from "@kenstack/forms/FormContainer";
// import useForm from "@kenstack/forms/useForm";
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
    recordKey,
    single,
    apiPath,
    name,
  } = useAdminEdit();
  const loadTarget = single ? recordKey : id;
  const basePathname = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // removes empty strings
    parts.pop(); // remove last segment
    return "/" + parts.join("/");
  }, [pathname]);

  return (
    <Form
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
            changes,
            values,
          },
        );
      }}
      onSuccess={(data, variables, { form }) => {
        queryClient.invalidateQueries({ queryKey: ["admin-list"] });
        queryClient.setQueryData(["admin-edit", name, loadTarget], {
          status: "success",
          id: data.id,
          item: data.values,
        });
        queryClient.removeQueries({
          queryKey: ["admin-edit", name, loadTarget, "revisions"],
          exact: true,
        });

        if (variables.submitter === "list") {
          router.push(
            basePathname + (searchParams.size ? "?" + searchParams : ""),
          );
        } else if (variables.submitter === "new") {
          if (isNew) {
            form.reset(defaultValues);
          } else {
            router.push(
              basePathname +
                "/new" +
                (searchParams.size ? "?" + searchParams : ""),
            );
          }
        } else if (isNew) {
          router.push(
            basePathname +
              "/" +
              data.id +
              (searchParams.size ? "?" + searchParams : ""),
          );
        }
      }}
      onSubmit={({ data, mutation, event, form }) => {
        const changes = Object.keys(form.formState.dirtyFields);
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
