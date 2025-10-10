import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
// import FormContainer from "@kenstack/forms/FormContainer";
// import useForm from "@kenstack/forms/useForm";
import Form from "@kenstack/forms/Form";
import omit from "lodash-es/omit";
import fetcher from "@kenstack/lib/fetcher";

import { useAdminEdit } from "./context";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AdminEditForm({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { defaultValues, adminConfig, isNew, id, apiPath } = useAdminEdit();
  const basePathname = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // removes empty strings
    parts.pop(); // remove last segment
    return "/" + parts.join("/");
  }, [pathname]);

  return (
    <Form<{ id: string; values: Record<string, unknown> }>
      schema={adminConfig.schema}
      defaultValues={defaultValues}
      apiPath={apiPath}
      mutationFn={async (vars) => {
        return fetcher(apiPath + "/save", {
          id,
          isNew,
          ...omit(vars, ["meta"]),
        });
      }}
      onSuccess={(data, variables, { form }) => {
        queryClient.invalidateQueries({ queryKey: ["admin-list"] });
        queryClient.setQueryData(["admin-edit", data.id], {
          status: "success",
          id: data.id,
          item: data.values,
        });

        if (variables.action === "list") {
          router.push(
            basePathname + (searchParams.size ? "?" + searchParams : "")
          );
        } else if (variables.action === "new") {
          if (isNew) {
            form.reset(defaultValues);
          } else {
            router.push(
              basePathname +
                "/new" +
                (searchParams.size ? "?" + searchParams : "")
            );
          }
        } else if (isNew) {
          router.push(
            basePathname +
              "/" +
              data.id +
              (searchParams.size ? "?" + searchParams : "")
          );
        }
      }}
      onSubmit={({ data, mutation, event }) => {
        const button = (event.nativeEvent as SubmitEvent)
          ?.submitter as HTMLButtonElement;
        if (button && button.name === "action") {
          return mutation.mutateAsync({ action: button.value, ...data });
        } else {
          return mutation.mutateAsync(data);
        }
      }}
    >
      {children}
    </Form>
  );
}
