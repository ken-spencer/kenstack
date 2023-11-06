import { useCallback } from "react";
import MenuItem from "@mui/material/MenuItem";

import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";

export default function LogoutButton() {
  const handleClick = useCallback((evt) => {
    // evt.stopPropagation();
    const form = evt.target.closest("form");
    form.requestSubmit();
  }, []);
  return (
    <MenuItem onClick={handleClick}>
      <ListItemIcon>
        <LogoutIcon fontSize="small" />
      </ListItemIcon>
      Logout
    </MenuItem>
  );
}
