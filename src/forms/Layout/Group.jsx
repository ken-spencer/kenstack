import { useMemo } from "react";
import sentenceCase from "@kenstack/utils/sentenceCase";
import { twMerge } from "tailwind-merge";

import styles from "./layout.module.scss";

// import GridItem from "../Grid/Item";
import pick from "lodash/pick";
import Fields from "./Fields";

export default function Group(props) {
  let {
    name,
    fields,
    title,
    containerClass = "",
    titleClass = "",
    bodyClass = "",
  } = props;

  const classesContainer = useMemo(
    () => twMerge("col-span-12", containerClass),
    [containerClass],
  );

  const classesTitle = useMemo(() => twMerge("", titleClass), [titleClass]);

  const classesBody = useMemo(
    () => twMerge("grid grid-cols-12 gap-4", bodyClass),
    [bodyClass],
  );

  /*
  if (!label) {
    label = sentenceCase(name);
  }
  */

  /*
  if (!fields || fields.length === 0) {
    return null;
  }
  */

  return (
    <section className={classesContainer}>
      {title && <h1 className={classesTitle}>{title}</h1>}
      <div className={classesBody}>
        <Fields fields={fields} />
      </div>
    </section>
  );
}
