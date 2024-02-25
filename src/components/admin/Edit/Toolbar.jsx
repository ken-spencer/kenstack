"use client";

import useForm from "@thaumazo/forms/useForm";

import styles from "../admin.module.scss";

import { usePathname, useRouter } from "next/navigation";
import useAdmin from "./useAdmin";

import Title from "../Title";
// import Button from "@mui/material/Button";
import Button from "@thaumazo/forms/Submit";
import SaveIcon from "@mui/icons-material/SaveOutlined";
import AddIcon from "@mui/icons-material/Add";
import ListIcon from "@mui/icons-material/List";
import Delete from "./Delete";

export default function AdminEditToolbar() {
  const form = useForm();

  const { modelName, setConfirm, loaded } = useAdmin();

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
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
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
      <div className={styles.toolbarRight}>
        <Delete />
      </div>
    </div>
  );
}
