import { resolveServerFields } from "@kenstack/fields/server";

import { pageEditorFields } from "./fields";

export const pageEditorServerFields = resolveServerFields(pageEditorFields);
