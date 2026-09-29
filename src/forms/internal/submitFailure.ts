"use client";

import { createContext, useContext } from "react";

// The form's last submit ended with field errors, recorded where the submit or its request ends, so the
// notice never infers it from state updates that can land in either order. A new object marks each
// failure; the next submit clears it.
export const SubmitFailureContext = createContext<{
  setSubmitFailure: (failure: object | null) => void;
  submitFailure: object | null;
}>({ setSubmitFailure: () => {}, submitFailure: null });

export function useSubmitFailure() {
  return useContext(SubmitFailureContext);
}
