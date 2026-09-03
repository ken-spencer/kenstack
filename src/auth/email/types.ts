import type { FC, ReactNode } from "react";

export type EmailContainer = FC<{
  children: ReactNode;
  preview?: boolean;
}>;
