"use client";

// import saveAction from "./saveAction";
import { useCallback } from "react";

import Form from "@kenstack/forms/Form";
import Toolbar from "./Toolbar";
import Notice from "./Notice";
import AdminFields from "./Fields";
import Confirm from "./Confirm";
// import Login from "../LoginWindow";

import FormProvider from "@kenstack/forms/Provider";
import { useAdminEdit } from "./context";
import { usePathname, useRouter } from "next/navigation";

import apiAction from "@kenstack/client/apiAction";

export default function AdminEditFormCont() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    loaded,
    row,
    // loadError,
    setRow,
    setLogin,
    apiPath,
  } = useAdminEdit();

  // const arg = { isNew, id, pathName, modelName };
  // const saveActionBound = saveAction.bind(null, arg);
  const saveActionBound = (state, formData) => {
    return apiAction(apiPath + "/save", formData, { pathname });
  };

  const handleResponse = useCallback(
    (evt, form) => {
      if (form.state?.login) {
        setLogin(form.state.login);
      } else if (form.state?.success && form.state?.row) {
        setRow(form.state.row);
      }

      if (form.state?.redirect) {
        let path = form.state?.redirect;
        if (pathname === path && path.endsWith("/new")) {
          form.reset();
        } else {
          router.push(path);
        }
      }
    },
    [pathname, router, setRow, setLogin],
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
      // result="none"
      values={row}
      action={saveActionBound}
      disabled={loaded === false}
      // fieldProps={loaded ? {} : { InputLabelProps: { shrink: true } }}
    >
      <Form className="w-full" reset={false} onResponse={handleResponse}>
        <Confirm />
        {/*
        <Login login={login} setLogin={setLogin} />
        */}
        <Toolbar />
        <Notice />
        <AdminFields />
      </Form>
    </FormProvider>
  );
}
