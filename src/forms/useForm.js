import { useContext } from "react";
import FormContext from "./Context";

export default function useForm() {
  const context = useContext(FormContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch form context. Please ensure that the form is wrapped with the <Provider>",
    );
  }

  const { form } = context;
  return form;
}
