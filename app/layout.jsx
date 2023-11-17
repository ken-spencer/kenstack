import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
import TopBar from "@thaumazo/cms/components/TopBar";

export const metadata = {
  title: "Thaumazo CMS",
  description: "Content management sponsored by Thaumazo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
