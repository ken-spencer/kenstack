"use client";

import { createContext } from "react";

// True inside a field the admin editor shows read-only, set by Field from the access rules. Text
// controls turn readOnly, so their text can still be selected and copied; every other control in the
// field disables itself. A file of its own, so a control reads it without importing Field.
export const FieldLockedContext = createContext(false);
