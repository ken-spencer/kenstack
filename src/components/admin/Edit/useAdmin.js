import { useContext } from "react";
import Context from "./Context";

export default function useAdmin() {
  const context = useContext(Context);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch admin  context. Please ensure that the admin Provider is present",
    );
  }

  return context;
}
