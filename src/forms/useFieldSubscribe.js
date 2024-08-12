import useForm from "./useForm";

import { useReducer, useEffect } from "react";
const reducer = (count) => count + 1;

export default function useFieldSubscribe(fieldName) {
  const form = useForm();
  const [, render] = useReducer(reducer, 0);

  useEffect(() => {
    if (!fieldName) {
      return;
    }
    form.subscribe(fieldName, render);
    return () => {
      form.unsubscribe(fieldName, render);
    };
  }, [fieldName, form]);

  return form.fields.get(fieldName);
}
