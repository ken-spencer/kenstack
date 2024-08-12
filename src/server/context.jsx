"use client";

import React, { createContext, useContext } from "react";

// Create a context with a default value
const ServerContext = createContext(null);

export function ServerProvider({ children, ...props }) {
  return (
    <ServerContext.Provider value={props}>{children}</ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === null) {
    throw new Error("useAdmin must be used within an ServerProvider");
  }
  return context;
}

export default ServerProvider;
