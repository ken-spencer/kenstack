"use client";

import React, { createContext, useContext, useMemo } from "react";

const LoginContext = createContext(null);

export function LoginProvider({ forgottenPasswordPath, apiPath, children }) {
  const values = useMemo(
    () => ({
      forgottenPasswordPath,
      apiPath,
    }),
    [forgottenPasswordPath, apiPath]
  );

  return (
    <LoginContext.Provider value={values}>{children}</LoginContext.Provider>
  );
}

export function useLogin() {
  const context = useContext(LoginContext);
  if (context === null) {
    throw new Error("useLogin must be used within an LoginProvider");
  }
  return context;
}
