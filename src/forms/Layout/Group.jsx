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
    card = false,
    title,
    containerClass = "",
    span = "",
    titleClass = "",
    bodyClass = "",
  } = props;

  const classesContainer = useMemo(
    () =>
      twMerge(
        card ? "border border-gray-500 rounded" : "",
        "col-span-12",
        span,
        containerClass,
      ),
    [card, containerClass, span],
  );

  const classesTitle = useMemo(
    () => twMerge(card ? "bg-gray-300 dark:bg-gray-700  px-2" : "", titleClass),
    [card, titleClass],
  );

  const classesBody = useMemo(
    () => twMerge(card ? "px-2" : "", "grid grid-cols-12 gap-2", bodyClass),
    [card, bodyClass],
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
