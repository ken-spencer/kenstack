import { useState, useRef, useMemo } from "react";

import MenuContext from "./Context";

export default function MenuProvider({ children }) {
  const menuButtonRef = useRef();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const context = useMemo(() => {
    return {
      menuButtonRef,
      menuOpen,
      setMenuOpen,
      userInfo,
      setUserInfo,
    };
  }, [menuOpen, userInfo]);

  return (
    <MenuContext.Provider value={context}>{children}</MenuContext.Provider>
  );
}
