import { useEffect, useState } from "react";

export default function useDarkMode(defaultDark = true) {
  const [darkMode, setDarkMode] = useState(defaultDark);

  const modeMe = (e) => {
    setDarkMode(!!e.matches);
  };

  useEffect(() => {
    const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");

    setDarkMode(matchMedia.matches);
    matchMedia.addEventListener("change", modeMe);

    return () => matchMedia.removeEventListener("change", modeMe);
  }, []);

  return darkMode;
}
