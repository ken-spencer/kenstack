"use client";

import saveAction from "./saveAction";

import AutoForm from "@admin/forms/AutoForm";

/*
import ThemeProvider from "@admin/forms/ThemeProvider";
import Typography from "@mui/material/Typography";
import Form from "@admin/forms/Form";
import Notice from "@admin/forms/Notice";
import Submit from "@admin/forms/Submit";
import Layout from "@admin/forms/Layout";
*/

import fields from "./fields";

export default function AdminBootstrapForm() {
  /*
  const handleResponse = (evt, res) => {
  };
  */

  return (
    <div style={{ maxWidth: "600px;" }}>
      <AutoForm
        title="Setup Admin Account"
        action={saveAction}
        fields={fields}
        submit="Create account"
      />
    </div>
  );
}
