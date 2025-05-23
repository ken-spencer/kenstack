import { useAdminEdit } from "@kenstack/modules/AdminEdit/context";
import Button from "@kenstack/forms/Button";
import apiAction from "@kenstack/client/apiAction";

import { useMutation } from "@tanstack/react-query";

export default function SwitchUser() {
  const { id, userId } = useAdminEdit();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      return apiAction("/admin/api/switch-user", { id });
    },
  });

  if (!id) {
    return null;
  }

  return (
    <div className="field col-span-12">
      <Button
        // className="whitespace-nowrap"
        disabled={id === userId}
        loading={isPending}
        type="button"
        onClick={() => {
          mutate();
        }}
      >
        Switch to User
      </Button>
    </div>
  );
}
