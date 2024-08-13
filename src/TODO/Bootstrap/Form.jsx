"use client";

import saveAction from "./saveAction";

import AutoForm from "@kenstack/forms/AutoForm";

/*
import ThemeProvider from "@kenstack/forms/ThemeProvider";
import Typography from "@mui/material/Typography";
import Form from "@kenstack/forms/Form";
import Notice from "@kenstack/forms/Notice";
import Submit from "@kenstack/forms/Submit";
import Layout from "@kenstack/forms/Layout";
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
