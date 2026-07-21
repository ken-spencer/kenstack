"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AdminUiState {
  adminControlCount: number;
  showAdminControls: boolean;
  pageSettingsAction: (() => void) | null;
  pageEditorError: string | null;

  registerAdminControl: () => void;
  unregisterAdminControl: () => void;
  setShowAdminControls: (showAdminControls: boolean) => void;
  setPageSettingsAction: (pageSettingsAction: (() => void) | null) => void;
  clearPageSettingsAction: (pageSettingsAction: () => void) => void;
  setPageEditorError: (pageEditorError: string | null) => void;
}

export const useAdminUi = create<AdminUiState>()(
  persist(
    (set) => ({
      adminControlCount: 0,
      showAdminControls: false,
      pageSettingsAction: null,
      pageEditorError: null,

      registerAdminControl: () => {
        set(({ adminControlCount }) => ({
          adminControlCount: adminControlCount + 1,
        }));
      },

      unregisterAdminControl: () => {
        set(({ adminControlCount }) => ({
          adminControlCount: Math.max(0, adminControlCount - 1),
        }));
      },

      setShowAdminControls: (showAdminControls) => {
        set({
          showAdminControls,
          ...(!showAdminControls ? { pageEditorError: null } : {}),
        });
      },

      setPageSettingsAction: (pageSettingsAction) => {
        set({ pageSettingsAction });
      },

      clearPageSettingsAction: (pageSettingsAction) => {
        set((state) =>
          state.pageSettingsAction === pageSettingsAction
            ? { pageSettingsAction: null }
            : {},
        );
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
  const { registerAdminControl, showAdminControls, unregisterAdminControl } =
    useAdminUi();

  useEffect(() => {
    registerAdminControl();

    return unregisterAdminControl;
  }, [registerAdminControl, unregisterAdminControl]);

  return { showAdminControls };
}
