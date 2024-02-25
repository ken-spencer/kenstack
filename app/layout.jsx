import React from "react";
import "./globals.css";
import "@thaumazo/forms/global.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
import TopBar from "@thaumazo/cms/components/TopBar";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";

export const metadata = {
  title: "Thaumazo CMS",
  description: "Content management sponsored by Thaumazo",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <TopBar />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
