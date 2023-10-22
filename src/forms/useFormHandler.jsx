import { useCallback, useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import camelCase from "lodash/camelCase";
import { useRouter } from "next/navigation";

import Notice from "components/Notice";

export default function useFormHandler(
  url,
  {
    name = null, // unique name in case multipe forms are on the same page
  } = {},
) {
  const router = useRouter();

  if (name === null) {
    name = camelCase(url);
  }

  const [error, setError] = useState();
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const error = Cookies.get(name + "Error");
    if (error !== undefined) {
      setError(error);
      Cookies.remove(name + "Error");
    }
  }, [name]);

  const handleSubmit = useCallback(
    (evt, { reset, setSubmitted, values }) => {
      setSuccess();
      setError();
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          payload: values,
        }),
      })
        .then(async (res) => {
          if (res.headers.get("content-type") != "application/json") {
            let message =
              "The response we received was invalid. Please try again later";
            if (res.status === 404) {
              message =
                "There was a problem submitting your request. Please try again later";
            }

            setError(message);
            console.error("Recieved: " + res.headers.get("content-type"));
            setSubmitted(false);
            return;
          }

          const json = await res.json();
          const { type, message, payload = {} } = json;
          const { action = null } = payload;

          if (type === "success") {
            setSuccess(message);
            reset();
          } else {
            setError(message);
            setSubmitted(false);
          }

          switch (action) {
            case "login":
              router.push("/login");
              break;
            case "redirect":
              router.push(payload.value);
              break;
          }
        })
        .catch((e) => {
          console.error(e);
          setError(
            "There was a problem handling your request. Please try again later",
          );
          setSubmitted(false);
        });
    },
    [url, name, router],
  );

  const notice = (() => {
    if (error) {
      return <Notice severity="error">{error}</Notice>;
    } else if (success) {
      return <Notice severity="success">{success}</Notice>;
    }
    return null;
  })();

  const retval = useMemo(
    () => ({
      notice,
      error,
      setError,
      success,
      setSuccess,
      handleSubmit,
    }),
    [notice, handleSubmit, error, setError, success, setSuccess],
  );

  return retval;
}
