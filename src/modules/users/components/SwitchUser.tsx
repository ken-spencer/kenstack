import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "@kenstack/forms/context";

import Button from "@kenstack/components/Button";
import fetcher from "@kenstack/api/fetcher";

export default function SwitchUser() {
  const { id, userId, apiPath, name: tableName } = useAdminEdit();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setStatusMessage } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      setStatusMessage(null);
      router.prefetch("/");
      return fetcher(apiPath, {
        action: "impersonate",
        name: tableName,
        userId: id,
      });
    },
    onSuccess: (res) => {
      if (res.status === "error") {
        setStatusMessage(res);
      } else {
        queryClient.invalidateQueries({ queryKey: ["user-info"] });
        router.push("/");
      }
    },
    onError: (err) => {
      setStatusMessage(err);

      // eslint-disable-next-line no-console
      console.error(err);
    },
  });

  if (!id) {
    return null;
  }

  return (
    <div className="field col-span-12">
      <Button
        disabled={id === userId}
        isPending={isPending}
        type="button"
        onClick={() => mutate()}
      >
        Switch to User
      </Button>
    </div>
  );
}
