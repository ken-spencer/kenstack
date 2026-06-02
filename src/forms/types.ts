import {
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";

export type AnyField = ControllerRenderProps<FieldValues, Path<FieldValues>>;
