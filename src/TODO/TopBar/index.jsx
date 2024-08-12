"use client";

import styles from "./topbar.module.css";

import theme from "../theme";
import MenuProvider from "./AccountSettings/Provider";
import AccountMenu from "./AccountSettings/AccountMenu";

import { ThemeProvider } from "@mui/material/styles";

import Link from "next/link";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Account from "./Account";

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

const pages = [
  /*
  ["/projects", "Projects"],
  ["/contact", "Contact"],
  */
];

/*
const ButtonLarge = styled(Button)(({ theme }) => ({
  color: "#eee",
  marginRight: 20,
  fontSize: 20,
}));
*/

export default function TopBar() {
  return (
    <ThemeProvider theme={theme}>
      <div className={styles.spacer} />
      <MenuProvider>
        <AppBar position="fixed" classes={{ root: styles.appBar }}>
          <Toolbar
            variant="dense"
            disableGutters
            classes={{ root: styles.toolbar }}
          >
            {false && (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Link key="siteName" href="/" className={styles.siteName} passHref>
              <Button color="inherit">Thaumazo</Button>
            </Link>
            <ButtonGroup
              key="primary-nav"
              variant="text"
              className={styles.navigation}
            >
              {pages.map(([path, title]) => {
                return (
                  <Link key={path} href={path} passHref>
                    <Button
                      color="inherit"
                      // sx={{ color: name == path ? "#222" : null }}
                    >
                      {title}
                    </Button>
                  </Link>
                );
              })}
            </ButtonGroup>
            <Account />
          </Toolbar>
        </AppBar>
        <AccountMenu />
      </MenuProvider>
    </ThemeProvider>
  );
}
