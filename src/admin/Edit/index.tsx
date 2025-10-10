import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";

export default function AdminEdit({ adminConfig }) {
  const Component = adminConfig.edit.component;
  return (
    <AdminEditProvider adminConfig={adminConfig}>
      <div className="flex flex-col gap-2">
        <Header />
        <Alerts />
        <Component />
        <Footer />
      </div>
    </AdminEditProvider>
  );
}
