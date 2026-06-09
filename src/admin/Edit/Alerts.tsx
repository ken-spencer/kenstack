"use client";
import Notice from "@kenstack/forms/Notice";
import Alert from "@kenstack/components/Alert";
import { useFormContext } from "react-hook-form";

export default function AdminEditAlerts() {
  const {
    formState: { isSubmitted, errors },
    control,
  } = useFormContext();
  const hasFieldErrors = Object.keys(errors).length > 0;
  const showAlert = isSubmitted && hasFieldErrors;

  return (
    <>
      {showAlert && (
        <Alert>
          <div>
            We couldn&apos;t save your changes. Check the highlighted fields
            below for more information.
          </div>
          <ul className="mt-4 list-disc pl-8 empty:hidden">
            {Object.entries(errors).reduce<React.ReactNode[]>(
              (acc, [name, fieldError]) => {
                if (fieldError && "message" in fieldError) {
                  if (!control._fields[name]) {
                    acc.push(
                      <li
                        key={name}
                      >{`Unrendered field ${name} has error ${fieldError.message}`}</li>,
                    );
                  }
                }
                return acc;
              },
              [],
            )}
          </ul>
        </Alert>
      )}
      {showAlert ? null : <Notice />}
    </>
  );
}
