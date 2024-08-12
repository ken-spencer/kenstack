"use client";

import React, { createContext, useContext, useMemo } from "react";

const ForgottenPasswordContext = createContext(null);

export function ForgottenPasswordProvider({ loginPath, apiPath, children }) {
  const values = useMemo(
    () => ({
      loginPath,
      apiPath,
    }),
    [loginPath, apiPath],
  );

  return (
    <ForgottenPasswordContext.Provider value={values}>
      {children}
    </ForgottenPasswordContext.Provider>
  );
}

export function useForgottenPassword() {
  const context = useContext(ForgottenPasswordContext);
  if (context === null) {
    throw new Error(
      "useForgottenPassword must be used within an ForgottenPasswordProvider",
    );
  }
  return context;
}
