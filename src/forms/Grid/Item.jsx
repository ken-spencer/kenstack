import { useMemo } from "react";

import omit from "lodash/omit";

import styles from "./grid.module.scss";

const gridProps = ["xs", "sm", "md", "lg", "xl"];

export default function GridItem({ hideIfEmpty = false, className, ...props }) {
  const divProps = omit(props, gridProps);

  const classProp = useMemo(() => {
    let gridClasses = className ? className + " " : "";
    let classes = gridProps.reduce((acc, key) => {
      if (props[key]) {
        let name = `${key}-${props[key]}`;
        if (!styles[name]) {
          throw Error(`Unknown value for Grid/Item prop ${key}: ${props[key]}`);
        }
        acc.push(styles[name]);
      }
      return acc;
    }, []);

    if (classes.length === 0) {
      classes.push(styles["xs-12"]);
    }

    if (hideIfEmpty) {
      classes.push(styles.hideEmpty);
    }

    gridClasses += classes.join(" ");

    return gridClasses;
  }, [className, hideIfEmpty, props]);

  return <div className={classProp} {...divProps} />;
}

// ientify so we can count child component
GridItem.isGridItem = true;
