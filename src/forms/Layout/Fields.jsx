import { useMemo } from "react";

import Field from "./Field";

export default function Fields(props) {
  const { fields } = props;

  const fieldList = useMemo(() => Array.from(Object.entries(fields)), [fields]);

  if (!fields) {
    return null;
  }

  return (
    <>
      {fieldList.map(([name, field]) => (
        <Field key={name} name={name} {...field} />
      ))}
    </>
  );
}
