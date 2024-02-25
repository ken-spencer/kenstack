"use client";

import { useParams } from "next/navigation";

import { useState } from "react";

import ListItem from "./ListItem";

import PasswordIcon from "@mui/icons-material/PasswordOutlined";

import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import logoutAction from "../../../auth/logoutAction";

import SyncIndexesButton from "./SyncIndexes/Button";

import styles from "./sidebar.module.scss";

import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";

// import Divider from '@mui/material/Divider';

import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
// import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

// import { styled } from '@mui/material/styles';

const adminNav = Array.from(thaumazoAdmin.models.values());

export default function Sidebar(props) {
  const [open, setOpen] = useState(true);

  const params = useParams();
  let [segment = null] = params.admin || [];
  if (segment && (segment === "new" || segment.match(/^[0-9a-fA-F]{24}$/))) {
    segment = null;
  }
  const path = "/" + (segment || "");

  // const handleClose = () => setOpen(false);
  const handleOpen = () => setOpen(true);

  return (
    <div className={styles.container}>
      <div
        className={
          styles.openButton + (open ? " " + styles.openButtonOpen : "")
        }
      >
        <IconButton onClick={handleOpen}>
          <Avatar>
            <KeyboardDoubleArrowRightIcon />
          </Avatar>
        </IconButton>
      </div>

      <div className={styles.panes}>
        <div className={styles.drawer + (open ? " " + styles.drawerOpen : "")}>
          {/*
          <div className={styles.drawerHead}>
            <IconButton onClick={handleClose}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
    */}

          <ul className="space-y-2 font-medium">
            {adminNav.map((admin) => {
              return (
                <ListItem
                  key={admin.modelName}
                  icon={admin.icon}
                  active={path === admin.path}
                  href={thaumazoAdmin.pathName(admin.path)}
                >
                  {admin.title}
                </ListItem>
              );
            })}
          </ul>
          <hr className="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
          <ul className="space-y-2 font-medium">
            <ListItem
              icon={PasswordIcon}
              href={thaumazoAdmin.pathName("/reset-password")}
              active={segment === "reset-password"}
            >
              Reset password
            </ListItem>
            <SyncIndexesButton />
            <ListItem
              component="button"
              icon={LogoutIcon}
              action={logoutAction}
            >
              Log out
            </ListItem>
          </ul>
        </div>
        <main className={styles.main + (open ? " " + styles.mainOpen : "")}>
          <div className={styles.admin}>{props.children}</div>
        </main>
      </div>
    </div>
  );
}

/*
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
      >
        <div className={styles.drawerHead}>
          <IconButton onClick={handleClose}>
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <Divider />
      </Drawer>
*/
