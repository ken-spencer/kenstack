"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";
// import revalidateAction from "../auth/revalidateAction";

function revalidate() {
  const auth = Cookies.get("authPublic");
  if (auth) {
    const json = atob(auth);
    let { expires } = JSON.parse(json);

    const seconds = Math.round((expires - Date.now()) / 1000);
    // session has 45 minutes to expire
    if (seconds > 0 && seconds < 2700) {
      fetch("/admin/api", {
        method: "POST",
        headers: { "x-action": "revalidate" },
        body: "",
        cache: "no-store",
      }).catch(() => {
        // do nothing
      });
    }
  }
}

const events = ["click", "keydown", "touchstart"];

const delay = 15 * 60 * 1000; // 15 minute delay

export default function Revalidate() {
  const last = useRef(Date.now() + delay);

  useEffect(() => {
    revalidate();

    // Warning, this code seemed clever, but chaning the cookie also refreshes the state
    const handleInteraction = () => {
      if (Date.now() - last.current > 0) {
        revalidate();
        last.current = Date.now() + delay;
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleInteraction);
    });
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);
  return null;
}
