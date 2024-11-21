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
    (type, path = null) =>
    (evt) => {
      const button = evt.currentTarget;
      button.setAttribute("name", "adminAction");
      button.setAttribute("value", JSON.stringify([type, { path }]));

      // const name = evt.currentTarget.getAttribute("name");
      // const action = evt.currentTarget.getAttribute("value");
      // if (!path && name === "adminAction") {
      //   if (action.match(/^\[/)) {
      //     const json = JSON.parse(action);
      //     const [, info] = json;
      //     path = info.path;
      //   }
      // }

      if (form.changed && !evt.target.closest("form").checkValidity()) {
        setConfirm(path);
      } else if (path) {
        router.push(path);
        evt.preventDefault();
      }
    };

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-left">
        <AdminIcon type="submit" name="adminAction" value="save" tooltip="Save">
          <SaveIcon />
        </AdminIcon>
        <AdminIcon
          type="submit"
          onClick={handleClick("new", basePath + "/new")}
          // name="adminAction"
          // value={JSON.stringify(["new", { path: basePath + "/new" }])}
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
          onClick={handleClick("list", basePath)}
          // name="adminAction"
          // value={JSON.stringify(["list", { path: basePath }])}
          tooltip="Back to list"
        >
          <ArrowBackIcon />
        </AdminIcon>
      </div>
    </div>
  );
}
