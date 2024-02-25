"use client";

import { useEffect } from "react";
import revalidateAction from "../../../auth/revalidateAction";

export default function Revalidate() {
  useEffect(() => {
    setTimeout(() => {
      revalidateAction();
    }, 100);
  }, []);

  return null;
}
