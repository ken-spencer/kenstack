import MenuItem from "@mui/material/MenuItem";

import { useCallback, useState } from "react";

import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";

import logoutAction from "../../../auth/logoutAction";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const action = useCallback(() => {
    if (loading) {
      return;
    }
    setLoading(true);
    logoutAction().then(() => {
      window.location.reload();
    });
  }, [loading]);

  return (
    <MenuItem onClick={action}>
      <ListItemIcon>
        <LogoutIcon fontSize="small" />
      </ListItemIcon>
      Logout
    </MenuItem>
  );
}
