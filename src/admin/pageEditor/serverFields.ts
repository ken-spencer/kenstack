import { imageField, serverFields } from "@kenstack/fields/server";

import { pageEditorFields } from "./fields";

export const pageEditorServerFields = serverFields(pageEditorFields, {
  image: imageField({ variant: "original" }),
});
