import { create } from "zustand";

export interface AdminUiState {
  /**
   * True when the current user is authorized to edit (e.g. admin).
   */
  canEdit: boolean;

  /**
   * User intent: whether they want editing UI enabled.
   */
  editing: boolean;

  setCanEdit: (canEdit: boolean) => void;
  setEditing: (editing: boolean) => void;

  /**
   * Derived value: editing UI is only shown when allowed + desired.
   */
  isEditingEnabled: () => boolean;
}

export const useAdminUi = create<AdminUiState>((set, get) => ({
  canEdit: false,
  editing: false,

  setCanEdit: (canEdit) => {
    set(() => ({
      canEdit,
      editing: canEdit,
    }));
  },

  setEditing: (editing) => {
    set((s) => ({
      editing: s.canEdit ? editing : false,
    }));
  },

  isEditingEnabled: () => {
    const s = get();
    return s.canEdit && s.editing;
  },
}));
