"use client";

import { ThemeProvider as Provider, createTheme } from "@mui/material/styles";
// import CssBaseline from '@mui/material/CssBaseline';

import useDarkMode from "./useDarkMode";

const shared = {
  components: {
    // Name of the component ⚛️
    MuiButton: {
      styleOverrides: {
        // Name of the rule
        root: {
          // Some CSS
          textTransform: "none",
        },
      },
    },
  },
};

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  ...shared,
});

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
  ...shared,
});

export default function ThemeProvider({
  theme = "light", // light | dark | auto
  children,
}) {
  const useDark = useDarkMode();
  let chosenTheme = lightTheme;
  if (theme === "dark") {
    chosenTheme = darkTheme;
  } else if (theme === "auto") {
    chosenTheme = useDark ? darkTheme : lightTheme;
  }

  return <Provider theme={chosenTheme}>{children}</Provider>;
}
