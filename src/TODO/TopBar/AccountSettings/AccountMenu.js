import { useContext } from "react";
import MenuContext from "./Context";
import { useRouter } from "next/navigation";

import { useCallback } from "react";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";

import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ListItemIcon from "@mui/material/ListItemIcon";
import PasswordIcon from "@mui/icons-material/Password";
import Logout from "./Logout";

export default function AccountMenu() {
  const { menuButtonRef, setMenuOpen, menuOpen, userInfo } =
    useContext(MenuContext);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  return (
    <Menu
      anchorEl={menuButtonRef.current}
      open={menuOpen}
      onClose={handleClose}
      onClick={handleClose}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: "visible",
          filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
          mt: 1.5,
          "& .MuiAvatar-root": {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          "&:before": {
            content: '""',
            display: "block",
            position: "absolute",
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: "background.paper",
            transform: "translateY(-50%) rotate(45deg)",
            zIndex: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      {userInfo && userInfo.roles.includes("ADMIN")
        ? [
            <MenuItem
              key="admin"
              onClick={() => {
                router.push("/admin");
              }}
            >
              <ListItemIcon>
                <AdminPanelSettingsIcon fontSize="small" />
              </ListItemIcon>
              Admin
            </MenuItem>,
            <Divider key="admin-divider" />,
          ]
        : null}

      <MenuItem
        onClick={() => {
          router.push("/profile");
        }}
      >
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem
        onClick={() => {
          router.push("/reset-password");
        }}
      >
        <ListItemIcon>
          <PasswordIcon fontSize="small" />
        </ListItemIcon>
        Change password
      </MenuItem>
      <Logout />
    </Menu>
  );
}
