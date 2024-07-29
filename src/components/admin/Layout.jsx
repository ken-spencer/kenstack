import styles from "./admin.module.scss";

import Sidebar from "./Sidebar";

import ThemeProvider from "./ThemeProvider";

import "./styles/admin.scss";

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider theme="dark">
      <div className={"dark " + styles.container}>
        <Sidebar>{children}</Sidebar>
      </div>
    </ThemeProvider>
  );
}
