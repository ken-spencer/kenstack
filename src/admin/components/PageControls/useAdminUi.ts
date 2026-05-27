"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AdminUiState {
  hasAdminControl: boolean;
  showAdminControls: boolean;
  pageEditorError: string | null;

  setHasAdminControl: (hasAdminControl: boolean) => void;
  setShowAdminControls: (showAdminControls: boolean) => void;
  setPageEditorError: (pageEditorError: string | null) => void;
}

export const useAdminUi = create<AdminUiState>()(
  persist(
    (set) => ({
      hasAdminControl: false,
      showAdminControls: false,
      pageEditorError: null,

      setHasAdminControl: (hasAdminControl) => {
        set({ hasAdminControl });
      },

      setShowAdminControls: (showAdminControls) => {
        set({
          showAdminControls,
          ...(!showAdminControls ? { pageEditorError: null } : {}),
        });
      },

      setPageEditorError: (pageEditorError) => {
        set({ pageEditorError });
      },
    }),
    {
      name: "kenstack:inline-editing",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ showAdminControls }) => ({ showAdminControls }),
    },
  ),
);

export function useAdminControl() {
  const { setHasAdminControl, showAdminControls } = useAdminUi();

  useEffect(() => {
    setHasAdminControl(true);
  }, [setHasAdminControl]);

  return { showAdminControls };
}
