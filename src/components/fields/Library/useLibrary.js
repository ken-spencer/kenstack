import { useContext } from "react";
import Context from "./Context";

export default function useLibrary() {
  const context = useContext(Context);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch library  context. Please ensure that the Provider is present",
    );
  }

  return context;
}
