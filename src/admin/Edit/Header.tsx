import IconButton from "@kenstack/components/IconButton";
import { Plus, Save, List, ScanEye } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useAdminEdit } from "./context";
import { useForm } from "@kenstack/forms/context";
import { useSearchParams } from "next/navigation";

import Link from "next/link";
import DeleteButton from "./DeleteButton";

export default function AdminEditHeader() {
  const searchParams = useSearchParams();
  const {
    formState: { isDirty },
  } = useFormContext();

  const { mutation } = useForm();
  const { listPath, adminConfig, isNew, item } = useAdminEdit();
  return (
    <div className="flex gap-4 border-b">
      <div className="flex grow gap-1">
        <IconButton
          disabled={!isDirty || mutation.isPending}
          isPending={mutation.isPending && mutation.variables.action === "new"}
          className={isDirty ? "" : "hidden"}
          name="action"
          value="new"
          tooltip="New Entry"
        >
          <Plus className="size-6 text-gray-800" />
        </IconButton>
        <IconButton className={isDirty && "hidden"} tooltip="New Entry" asChild>
          <Link
            href={
              listPath + "/new" + (searchParams.size ? "?" + searchParams : "")
            }
          >
            <Plus className="size-6 text-gray-800" />
          </Link>
        </IconButton>

        <IconButton
          disabled={!isDirty || mutation.isPending}
          isPending={mutation.isPending && mutation.variables.action === "list"}
          className={isDirty ? "" : "hidden"}
          name="action"
          value="list"
          tooltip="Go To List"
        >
          <List className="size-6 text-gray-800" />
        </IconButton>
        <IconButton
          className={isDirty && "hidden"}
          tooltip="Go To List"
          asChild
        >
          <Link href={listPath + (searchParams.size ? "?" + searchParams : "")}>
            <List className="size-6 text-gray-800" />
          </Link>
        </IconButton>

        <IconButton
          disabled={!isDirty || mutation.isPending}
          isPending={mutation.isPending && mutation.variables.action === "save"}
          name="action"
          value="save"
          tooltip="Save"
        >
          <Save className="size-6 text-gray-800" />
        </IconButton>
      </div>
      <div className="">
        {adminConfig.preview && (
          <IconButton
            type="button"
            disabled={isNew}
            tooltip="View Content"
            onClick={() => window.open(adminConfig.preview(item), "_blank")}
          >
            <ScanEye className="size-6 text-gray-800" />
          </IconButton>
        )}

        <DeleteButton />
        {/* <IconButton
          disabled={isDirty || mutation.isPending}
          type="button"
          tooltip="Delete"
        >
          <Trash className="size-6 text-gray-800" />
        </IconButton> */}
      </div>
    </div>
  );
}
