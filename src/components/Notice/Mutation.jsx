import { useMemo } from "react";
import Notice from "./Notice";

export default function MutationNotice({ mutation, ...props }) {
  const actionState = useMemo(() => {
    if (!mutation) {
      return;
    }

    const { data, error } = mutation;

    return {
      error: error?.message ?? data?.error ?? null,
      success: typeof data?.success === "string" ? dta.success : null,
    };
  }, [mutation]);

  if (!mutation) {
    return (
      <Notice actionState={actionState} error="mutation prop is required" />
    );
  }

  return <Notice actionState={actionState} {...props} />;
}
