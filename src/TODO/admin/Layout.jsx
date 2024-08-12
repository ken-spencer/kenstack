
import Sidebar from "./Sidebar";

import ThemeProvider from "@admin/components/ThemeProvider";

// import "./styles/admin.scss";

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider theme="dark">
      <div className={"dark admin-container"}>
        <Sidebar>{children}</Sidebar>
      </div>
    </ThemeProvider>
  );
}
