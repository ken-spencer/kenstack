"use client";

import useAdmin from "./useAdmin";
import styles from "../admin.module.scss";

import Layout from "@thaumazo/forms/Layout";

export default function AdminEditFields() {
  const { modelName } = useAdmin();

  const admin = thaumazoAdmin.get(modelName);
  const fields = admin.getFields();

  return (
    <div className={styles.body}>
      <Layout fields={fields} />
    </div>
  );
}
