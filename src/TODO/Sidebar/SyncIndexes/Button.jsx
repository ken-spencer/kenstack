import { useCallback, useRef, useEffect, useState } from "react";

import ListItem from "../ListItem";
import SyncIcon from "@heroicons/react/24/outline/ArrowPathIcon";

import checkAction from "./checkAction";
import syncAction from "./syncAction";

export default function SyncIndexesButton() {
  const timeoutRef = useRef();
  const [count, setCount] = useState();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      checkAction().then(
        (count) => {
          setCount(count);
        },
        () => {},
      );
    }, 1000);
  }, []);

  const action = useCallback(() => {
    return syncAction().then((status) => {
      if (status) {
        setCount(0);
      }
    });
  }, []);

  if (!count) {
    return;
  }
  return (
    <ListItem
      component="button"
      icon={SyncIcon}
      disabled={count ? false : true}
      badge={count}
      action={action}
    >
      Sync Indexes
    </ListItem>
  );
}
