import Button from "@thaumazo/forms/Button";
import AccountBoxIcon from '@mui/icons-material/AccountBox';

import useLibrary from "../../useLibrary";


export default function Square({isLoading, file}) {
  const { setEdit } = useLibrary();
  return (
    <Button
      startIcon={<AccountBoxIcon />}
      type="button"
      disabled={isLoading || !file || (file.width === file.height)}
      onClick={() => {
        setEdit(e => ({...e, tool: e.tool === "square" ? null : "square"}));
      }}
    >
      Square
    </Button>
  );
}
