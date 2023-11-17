import ThemeProvider from "@thaumazo/forms/ThemeProvider";
import { Form, TextField, Submit } from "@thaumazo/forms";
import Notice from "../Notice";

import styles from "./form.module.css";

import SaveIcon from "@mui/icons-material/Save";

export default function ProfileForm() {
  return (
    <ThemeProvider theme="auto">
      <Form className={styles.container}>
        <div className={styles.item}>Profile</div>

        <div className={styles.errorItem}>
          <Notice />
        </div>

        <div className={styles.grid}>
          <div className={styles.gridItem}>
            <TextField name="first_name" required />
          </div>
          <div className={styles.gridItem}>
            <TextField name="last_name" required />
          </div>
        </div>

        <div className={styles.item}>
          <TextField name="email" type="email" required />
        </div>

        <div className={styles.item}>
          <Submit startIcon={<SaveIcon />}>Save</Submit>
        </div>
      </Form>
    </ThemeProvider>
  );
}
