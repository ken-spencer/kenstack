import { useState } from "react";
import Notice from "@kenstack/forms/Notice";
import Alert from "@kenstack/components/Alert";
import { useFormContext } from "react-hook-form";
import { useForm } from "@kenstack/forms/context";

export default function AdminEditAlerts() {
  const {
    formState: { isSubmitted, isValid, submitCount, errors },
  } = useFormContext();
  const { renderedFields } = useForm();
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
          <ul className="empty:hidden mt-4 pl-8 list-disc">
            {Object.entries(errors).reduce((acc, [name, { message }]) => {
              if (!renderedFields.has(name)) {
                acc.push(
                  <li
                    key={name}
                  >{`Unrendered field ${name} has error ${message}`}</li>
                );
              }
              return acc;
            }, [])}
          </ul>
        </Alert>
      )}
      <Notice />
    </>
  );
}
