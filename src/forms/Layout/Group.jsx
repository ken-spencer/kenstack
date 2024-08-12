import { useMemo } from "react";
import sentenceCase from "@admin/utils/sentenceCase";

import styles from "./layout.module.scss";

import GridItem from "../Grid/Item";
import pick from "lodash/pick";
import Fields from "./Fields";

import gridPropsList from "./gridProps";

export default function Group(props) {
  let { name, fields, label } = props;

  const gridProps = useMemo(() => {
    let retval = pick(props, gridPropsList);

    if (Object.keys(retval).length === 0) {
      retval.md = 12;
    }

    return retval;
  }, [props]);

  if (!label) {
    label = sentenceCase(name);
  }

  /*
  if (!fields || fields.length === 0) {
    return null;
  }
  */

  return (
    <GridItem {...gridProps}>
      <section className={styles.section}>
        <h1 className={styles.heading}>{label}</h1>
        <div className={styles.body}>
          <Fields fields={fields} />
        </div>
      </section>
      {/*
      <Card variant="outlined">
        <CardHeader sx={{ paddingBottom: 0 }} title={label} />
        <CardContent>
          <Fields fields={fields} />
        </CardContent>
      </Card>
    */}
    </GridItem>
  );
}
