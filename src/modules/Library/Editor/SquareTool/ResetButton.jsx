import { useSquareTool } from "./Provider";
// import Button from "@kenstack/forms/Button";
import AdminIcon from "@kenstack/components/AdminIcon";
import RefreshIcon from "@kenstack/icons/Refresh";

export default function ResetButton(props) {
  const { reset, changed } = useSquareTool();

  return (
    <AdminIcon
      {...props}
      disabled={!changed}
      onClick={() => {
        reset();
      }}
      tooltip="Reset"
    >
      <RefreshIcon />
    </AdminIcon>
  );
}
