"use client";

import { useState, useEffect } from "react";
import ThemeProvider from "@thaumazo/forms/ThemeProvider";

import { Provider } from "@thaumazo/forms";
import Form from "./Form";
// import AvatarEditor from "../AvatarEditor";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

import loadAction from "./loadAction";
import saveAction from "./saveAction";
import Notice from "../Notice";

import styles from "./form.module.css";

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
      <div className={styles.errorItem}>
        <ThemeProvider theme="auto">
          <Notice error={error} />
        </ThemeProvider>
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
    <Provider action={saveAction} values={values}>
      <Form />
    </Provider>
  );
}
