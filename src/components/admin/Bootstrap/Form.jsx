"use client";

import saveAction from "./saveAction";

import AutoForm from "@thaumazo/forms/AutoForm";

/*
import ThemeProvider from "@thaumazo/forms/ThemeProvider";
import Typography from "@mui/material/Typography";
import Form from "@thaumazo/forms/Form";
import Notice from "@thaumazo/forms/Notice";
import Submit from "@thaumazo/forms/Submit";
import Layout from "@thaumazo/forms/Layout";
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
