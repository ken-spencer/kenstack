"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from "react";

const BlockerContext = createContext<{
  blocked: boolean;
  setBlocked: (blocked: boolean) => void;
}>({
  blocked: false,
  setBlocked: () => {},
});

// Shares dirty-form navigation state with links in the persistent admin shell.
export function NavigationBlockerProvider({ children }: PropsWithChildren) {
  const [blocked, setBlocked] = useState(false);

  return (
    <BlockerContext.Provider value={{ blocked, setBlocked }}>
      {children}
    </BlockerContext.Provider>
  );
}

// Reads the current dirty-form navigation state and its form-owned setter.
export function useNavigationBlocker() {
  return useContext(BlockerContext);
}

// Cancels a Next.js client transition when the active form rejects discarding changes.
export function GuardedLink(
  props: Omit<ComponentProps<typeof Link>, "onNavigate">,
) {
  const { blocked } = useNavigationBlocker();

  return (
    <Link
      {...props}
      onNavigate={(event) => {
        if (
          blocked &&
          !window.confirm("Discard your unsaved changes and leave this page?")
        ) {
          event.preventDefault();
        }
      }}
    />
  );
}
