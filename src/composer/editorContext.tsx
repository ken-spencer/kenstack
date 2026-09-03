"use client";

import { createContext, useContext, type ReactNode } from "react";

const ComposerEditorContext = createContext<string | null>(null);

export function ComposerBlockEditorProvider({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  return (
    <ComposerEditorContext.Provider value={`blocks.${index}`}>
      {children}
    </ComposerEditorContext.Provider>
  );
}

export function useComposerBlockNamePrefix() {
  const prefix = useContext(ComposerEditorContext);
  if (!prefix) {
    throw new Error(
      "useComposerBlockNamePrefix must be used inside a Composer block editor.",
    );
  }
  return prefix;
}
