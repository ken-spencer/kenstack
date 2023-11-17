import MenuItem from "@mui/material/MenuItem";

import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";

import logoutAction from "../../../auth/logoutAction";
import useServerAction from "../../../useServerAction";

export default function LogoutButton() {
  // let [isPending, startTransition] = useTransition();

  const [isPending, action] = useServerAction(logoutAction);

  return (
    <MenuItem onClick={isPending ? undefined : action}>
      <ListItemIcon>
        <LogoutIcon fontSize="small" />
      </ListItemIcon>
      Logout
    </MenuItem>
  );
}
