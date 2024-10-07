"use client";

import useForm from "@kenstack/forms/useForm";

import { usePathname, useRouter } from "next/navigation";
import { useAdminEdit } from "./context";

import Title from "@kenstack/components/Title";
import Button from "@kenstack/forms/Submit";
import SaveIcon from "@heroicons/react/24/outline/CheckIcon";
import AddIcon from "@heroicons/react/24/outline/PlusIcon";
import ListIcon from "@heroicons/react/24/outline/ListBulletIcon";

import Delete from "./Delete";

export default function AdminEditToolbar() {
  const form = useForm();

  const { modelName, setConfirm, loaded } = useAdminEdit();

  const pathName = usePathname();
  const router = useRouter();

  const basePath = pathName.replace(/\/[^/]*$/, "");

  const handleClick =
    (type) =>
    (evt, path = null) => {
      const name = evt.target.getAttribute("name");
      const action = evt.target.getAttribute("value");
      if (!path && name === "adminAction") {
        if (action.match(/^\[/)) {
          const json = JSON.parse(action);
          const [, info] = json;
          path = info.path;
        }
      }

      if (evt.target.closest("form").checkValidity()) {
        return;
      }

      if (form.changed) {
        setConfirm(path);
        return;
      } else if (path) {
        router.push(path);
      }

      evt.preventDefault();

      /*
    if (path) {
    }
    */
    };

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-left">
        <Button
          name="adminAction"
          value="save"
          variant="contained"
          startIcon={<SaveIcon />}
        >
          Save
        </Button>
        <Button
          onClick={handleClick("new")}
          name="adminAction"
          value={JSON.stringify(["new", { path: basePath + "/new" }])}
          startIcon={<AddIcon />}
        >
          New
        </Button>
        <Button
          onClick={handleClick("list")}
          name="adminAction"
          value={JSON.stringify(["list", { path: basePath }])}
          variant="contained"
          startIcon={<ListIcon />}
        >
          List
        </Button>
      </div>

      <Title modelName={modelName} loading={loaded === false} />
      <div className="admin-toolbar-right">
        <Delete />
      </div>
    </div>
  );
}
