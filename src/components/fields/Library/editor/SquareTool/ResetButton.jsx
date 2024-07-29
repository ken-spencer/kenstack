import { useSquareTool } from "./Provider";
import Button from "@thaumazo/forms/Button";

export default function ResetButton(props) {
  const { reset, changed } = useSquareTool();

  return (
    <Button
      {...props}
      type="button"
      disabled={!changed}
      onClick={() => {
        reset();
      }}
    >
      Reset
    </Button>
  );
}
