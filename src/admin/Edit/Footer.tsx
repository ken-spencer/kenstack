import { useAdminEdit } from "./context";
import MetaDates from "../MetaDates";

export default function AdminEditFooter() {
  const { id, defaultValues: item } = useAdminEdit();
  return (
    <div className="py-2 border-t">{id && <MetaDates meta={item.meta} />}</div>
  );
}
