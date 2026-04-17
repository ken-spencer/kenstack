"use client";
import { useState } from "react";
import Notice from "@kenstack/forms/Notice";
import Alert from "@kenstack/components/Alert";
import { useFormContext } from "react-hook-form";

export default function AdminEditAlerts() {
  const {
    formState: { isSubmitted, isValid, submitCount, errors },
    control,
  } = useFormContext();
  const [lastSubmitCount, setLastSubmitCount] = useState(submitCount);

  const [showAlert, setShowAlert] = useState(false);
  // const lastSubmitCount = useRef(submitCount);

  // let showAlert = false;
  // if (lastSubmitCount.current !== submitCount) {
  //   showAlert = isSubmitted && !isValid;
  //   lastSubmitCount.current = submitCount;
  // }

  // useEffect(() => {
  //   if (lastSubmitCount.current !== submitCount) {
  //     setShowAlert(isSubmitted && !isValid);
  //   }
  //   lastSubmitCount.current = submitCount;
  // }, [isSubmitted, isValid, submitCount]);

  if (lastSubmitCount !== submitCount) {
    setLastSubmitCount(submitCount);
    setShowAlert(isSubmitted && !isValid);
  }

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
      <Notice />
    </>
  );
}
