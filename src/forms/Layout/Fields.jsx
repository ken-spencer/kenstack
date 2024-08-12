import { useMemo } from "react";
import Grid from "../Grid";

import Field from "./Field";

export default function Fields(props) {
  const { fields } = props;

  const fieldList = useMemo(() => Array.from(Object.entries(fields)), [fields]);

  if (!fields) {
    return null;
  }

  return (
    <Grid gap="16px">
      {fieldList.map(([name, field]) => (
        <Field key={name} name={name} {...field} />
      ))}
    </Grid>
  );
}
