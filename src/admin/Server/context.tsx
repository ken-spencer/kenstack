"use client";

import React, { createContext, useContext } from "react";

const ServerContext = createContext(null);

type ServerProvider = {
  name: string;
  isNew: boolean;
  id: string | null;
  children: React.ReactNode;
};

export function ServerProvider({ children, name, id, isNew }: ServerProvider) {
  return (
    <ServerContext.Provider value={{ name, id, isNew }}>
      {children}
    </ServerContext.Provider>
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
