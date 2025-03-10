"use client";

import { useForm } from "@kenstack/forms/context";

import { useRouter } from "next/navigation";
import { useAdminEdit } from "./context";

// import Title from "@kenstack/components/Title";
import AdminIcon from "@kenstack/components/AdminIcon";
import SaveIcon from "@kenstack/icons/Save";
import AddIcon from "@kenstack/icons/Add";
import ArrowBackIcon from "@kenstack/icons/ArrowBack";
import PreviousIcon from "@kenstack/icons/Previous";
import NextIcon from "@kenstack/icons/Next";

import Delete from "./Delete";
export default function AdminEditToolbar() {
  const changed = useForm((s) => s.changed);
  const invalid = useForm((s) => s.invalid);

  const { admin, setConfirm, basePathname, previous, next } = useAdminEdit();

  const router = useRouter();

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

      if (changed && invalid === true) {
        setConfirm(path);
      } else if (path) {
        evt.preventDefault();
        router.push(path);
      }
    };

  return (
    <div className="admin-toolbar">
      <AdminIcon
        type="submit"
        onClick={handleClick("list", basePathname)}
        tooltip="Back to list"
      >
        <ArrowBackIcon />
      </AdminIcon>
      <AdminIcon
        type="submit"
        tooltip="Previous"
        onClick={handleClick("list", basePathname + "/" + previous)}
        disabled={!previous}
      >
        <PreviousIcon />
      </AdminIcon>
      <AdminIcon
        type="submit"
        tooltip="Next"
        onClick={handleClick("list", basePathname + "/" + next)}
        disabled={!next}
      >
        <NextIcon />
      </AdminIcon>

      <AdminIcon
        type="submit"
        onClick={handleClick("new", basePathname + "/new")}
        tooltip="New entry"
      >
        <AddIcon />
      </AdminIcon>
      <AdminIcon type="submit" name="adminAction" value="save" tooltip="Save">
        <SaveIcon />
      </AdminIcon>

      <div className="flex-grow text-center">{admin.title}</div>

      <Delete />
    </div>
  );
}
