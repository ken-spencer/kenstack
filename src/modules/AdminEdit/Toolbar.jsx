"use client";

import useForm from "@kenstack/forms/useForm";

import { usePathname, useRouter } from "next/navigation";
import { useAdminEdit } from "./context";

import Title from "@kenstack/components/Title";
import AdminIcon from "@kenstack/components/AdminIcon";
import SaveIcon from "@kenstack/icons/Save";
import AddIcon from "@kenstack/icons/Add";
import ArrowBackIcon from "@kenstack/icons/ArrowBack";

import Delete from "./Delete";

export default function AdminEditToolbar() {
  const form = useForm();

  const { modelName, setConfirm, loaded } = useAdminEdit();

  const pathName = usePathname();
  const router = useRouter();

  const basePath = pathName.replace(/\/[^/]*$/, "");

  const handleClick =
    (type, path = "/") =>
    (evt) => {
console.log(path);
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
        <AdminIcon
          type="submit"
          name="adminAction"
          value="save"
          variant="contained"
          tooltip="Save"
        >
          <SaveIcon />
        </AdminIcon>
        <AdminIcon
          type="submit"
          onClick={handleClick("new")}
          name="adminAction"
          value={JSON.stringify(["new", { path: basePath + "/new" }])}
          tooltip="New entry"
        >
          <AddIcon />
        </AdminIcon>
        <Delete />
      </div>

      <Title modelName={modelName} loading={loaded === false} />
      <div className="admin-toolbar-right">
        <AdminIcon
          type="submit"
          onClick={handleClick("list")}
          name="adminAction"
          value={JSON.stringify(["list", { path: basePath }])}
          variant="contained"
          tooltip="Back to list"
        >
          <ArrowBackIcon />
        </AdminIcon>
      </div>
    </div>
  );
}
