import { useMemo } from "react";
import Grid from "../Grid";

import Group from "./Group";
import Field from "./Field";
// import formSchema from "../lib/formSchema";

export default function FormLayout({ gap = "16px", fields: fields = {} }) {
  // const fields = new formSchema(fieldTree);

  const fieldArray = useMemo(
    () => Array.from(Object.entries(fields)),
    // () => Array.from(fields),
    [fields],
  );

  return (
    <Grid gap={gap}>
      {fieldArray.map(([name, data]) => {
        if (data.fields) {
          return <Group key={name} name={name} {...data} />;
        } else {
          return <Field key={name} name={name} {...data} />;
        }
      })}
    </Grid>
  );
}

/*
      {Array.from(groups.values()).map((group) => (
      ))}
      <Fields fields={fields} />
*/
