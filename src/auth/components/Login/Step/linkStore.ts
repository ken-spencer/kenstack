"use client";

import { create } from "zustand";

// Whether the login step's controller is verifying an emailed link; its form shows that it is signing
// in meanwhile.
export const useLinkStore = create(() => ({ isVerifying: false }));
