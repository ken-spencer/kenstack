import styles from "./admin.module.scss";

import Sidebar from "./Sidebar";

import ThemeProvider from "./ThemeProvider";

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider theme="dark">
      <div className={"darkTheme " + styles.container}>
        <Sidebar>{children}</Sidebar>
      </div>
    </ThemeProvider>
  );
}
