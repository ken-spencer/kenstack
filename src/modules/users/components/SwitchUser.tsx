import { useAdminEdit } from "@kenstack/admin/Edit/context";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import Button from "@kenstack/components/Button";
import fetcher from "@kenstack/lib/fetcher";

export default function SwitchUser() {
  const { id, userId } = useAdminEdit();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      router.prefetch("/");
      return fetcher("/admin/api/switch-user", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
      router.push("/");
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
