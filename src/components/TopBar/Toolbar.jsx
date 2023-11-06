"use client";

import styles from "./topbar.module.css";

import theme from "components/theme";
import MenuProvider from "./AccountSettings/Provider";
import AccountMenu from "./AccountSettings/AccountMenu";

import { ThemeProvider } from "@mui/material/styles";

import Link from "next/link";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

import AccountSettings from "./AccountSettings";

const pages = [
  ["/projects", "Projects"],
  // ['/about', 'About'],
  ["/contact", "Contact"],
];

/*
const ButtonLarge = styled(Button)(({ theme }) => ({
  color: "#eee",
  marginRight: 20,
  fontSize: 20,
}));
*/

export default function TopBar({ claims }) {
  return (
    <ThemeProvider theme={theme}>
      <MenuProvider>
        <AppBar position="fixed" classes={{ root: styles.appBar }}>
          <Toolbar disableGutters classes={{ root: styles.toolbar }}>
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
            {claims ? (
              <AccountSettings />
            ) : (
              <Link key="login" href="/login">
                <Button color="inherit">Login</Button>
              </Link>
            )}
          </Toolbar>
        </AppBar>
        <AccountMenu />
      </MenuProvider>
    </ThemeProvider>
  );
}
