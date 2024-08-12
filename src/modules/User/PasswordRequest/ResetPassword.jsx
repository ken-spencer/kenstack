"use client";
import { useState } from "react";
import { useAdminEdit } from "@admin/modules/AdminEdit/context";
import Field from "@admin/forms/Field";

import Button from "@admin/forms/Button";
import Alert from "@admin/forms/Alert";

// import emailAction from "./emailAction";
import  apiAction from "@admin/client/apiAction";

export default function ResetPasswordField() {
  const { id } = useAdminEdit();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleClick = () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('id', id);

    apiAction("/forgotten-password/api", formData)
      .then(
        (res) => {
          setResponse(res);
        },
        (e) => {
          setResponse({
            error: "There was an unexpected Problem: " + e.message,
          });
        },
      )
      .finally(() => {
        setLoading(false);
      });

    /*
    emailAction(id)
    */
  };

  if (!id) {
    return null;
  }

  return (
    <Field label="Password reset">
      <div>
        Click the button below to send a password reset email to the user.{" "}
      </div>
      <div className="my-4">
        {response ? (
          <Alert {...response} />
        ) : (
          <Button loading={loading} onClick={handleClick}>
            Send email
          </Button>
        )}
      </div>
    </Field>
  );
}
