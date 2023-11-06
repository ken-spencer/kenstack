import { useState, useRef, useMemo } from "react";

import MenuContext from "./Context";

export default function MenuProvider({ children }) {
  const menuButtonRef = useRef();
  const [menuOpen, setMenuOpen] = useState(false);

  const context = useMemo(() => {
    return {
      menuButtonRef,
      menuOpen,
      setMenuOpen,
    };
  }, [menuOpen]);

  return (
    <MenuContext.Provider value={context}>{children}</MenuContext.Provider>
  );
}
