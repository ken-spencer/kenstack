"use client";

import { useState, useEffect } from "react";
import SaveIcon from "@mui/icons-material/Save";
// import AvatarEditor from "../AvatarEditor";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

import loadAction from "./loadAction";
import saveAction from "./saveAction";
import Notice from "../Notice";

import fields from "./fields";
import AutoForm from "@admin/forms/AutoForm";

export default function ProfileCont() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState();
  const [values, setValues] = useState();
  useEffect(() => {
    setTimeout(async () => {
      let response;
      try {
        response = await loadAction();
      } catch (e) {
        setError(
          "There was an unexpected problem retrieving the profile data. Please try again later.",
        );
        return;
      }

      if (response && response.success) {
        setValues(response.fields);
        setLoaded(true);
      }
    }, 100);
  }, []);

  if (error) {
    return (
      <div>
        <Notice error={error} />
      </div>
    );
  }

  if (loaded === false) {
    return (
      <Box sx={{ display: "flex" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AutoForm
      title="Profile"
      name="loginError"
      fields={fields}
      action={saveAction}
      values={values}
      submit={{
        startIcon: <SaveIcon />,
        children: "Save changes",
      }}
    />
  );
}
