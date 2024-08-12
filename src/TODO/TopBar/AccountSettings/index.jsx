import { useContext } from "react";
import MenuContext from "./Context";

import { useCallback } from "react";

//import Revalidate from "../../Revalidate";

import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export default function AccountSettingsButton() {
  const { open, menuButtonRef, setMenuOpen } = useContext(MenuContext);

  const handleClick = useCallback(() => {
    setMenuOpen(true);
  }, [setMenuOpen]);

  return (
    <>
      <Tooltip title="Account settings">
        <IconButton
          ref={menuButtonRef}
          onClick={handleClick}
          aria-controls={open ? "account-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <Avatar sx={{ width: 32, height: 32 }} />
        </IconButton>
      </Tooltip>
    </>
  );
}
