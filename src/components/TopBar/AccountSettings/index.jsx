import { useContext } from "react";
import MenuContext from "./Context";

import { useCallback } from "react";

import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export default function AccountSettingsButton() {
  const { menuButtonRef, setMenuOpen } = useContext(MenuContext);

  const handleClick = useCallback(() => {
    setMenuOpen(true);
  }, [setMenuOpen]);

  return (
    <Tooltip title="Account settings">
      <IconButton
        ref={menuButtonRef}
        onClick={handleClick}
        aria-controls={open ? "account-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        <Avatar />
      </IconButton>
    </Tooltip>
  );
}
