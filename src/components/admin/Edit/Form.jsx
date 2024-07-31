"use client";

import saveAction from "./saveAction";
import { useCallback } from "react";

import Form from "@admin/forms/Form";
import Toolbar from "./Toolbar";
import Notice from "./Notice";
import AdminFields from "./Fields";
import Confirm from "./Confirm";
import Login from "../LoginWindow";
// import Alert from "@mui/material/Alert";

import FormProvider from "@admin/forms/Provider";
import useAdmin from "./useAdmin";
import { usePathname, useRouter } from "next/navigation";

export default function AdminEditFormCont() {
  const router = useRouter();
  const pathName = usePathname();
  const {
    isNew,
    id,
    modelName,
    loaded,
    row,
    // loadError,
    setRow,
    // saveAction,
    login,
    setLogin,
  } = useAdmin();

  const arg = { isNew, id, pathName, modelName };
  const saveActionBound = saveAction.bind(null, arg);

  const handleResponse = useCallback(
    (evt, form) => {
      if (form.state?.login) {
        setLogin(form.state.login);
      } else if (form.state?.success && form.state?.row) {
        setRow(form.state.row);
      }

      if (form.state?.redirect) {
        let path = form.state?.redirect;
        if (pathName === path && path.endsWith("/new")) {
          form.reset();
        } else {
          router.push(path);
        }
      }
    },
    [pathName, router, setRow, setLogin],
  );

  /*
  if (loadError) {
    return (
      <Alert severity="error" variant="outlined">
        {loadError}
      </Alert>
    );
  }
  */

  return (
    <FormProvider
      result="none"
      values={row}
      action={saveActionBound}
      disabled={loaded === false}
      // fieldProps={loaded ? {} : { InputLabelProps: { shrink: true } }}
    >
      <Form className="w-full" onResponse={handleResponse}>
        <Confirm />
        <Login login={login} setLogin={setLogin} />
        <Toolbar />
        <Notice />
        <AdminFields />
      </Form>
    </FormProvider>
  );
}
