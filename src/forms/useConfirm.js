import { useEffect, useState } from "react";
import { useForm } from "./context";

// Restore if running from next.js
// import Router from 'next/router';

// confirm before leaving.
// TODO this component needs to be updated to work properly.
// specific problems with blocking page leave between submit and reqact-query completing a load
// Should be cancelled by any action that doesn't return an error until further changes
export default function useConfirm(message = "Exit without saving changes?") {
  const changed = useForm((state) => state.changed);
  const [confirm, setConfirm] = useState(message);

  useEffect(() => {
    if (!confirm) {
      return;
    }

    // const message = confirm;
    /* // restore this code if running from within next.js
    const routeChangeStart = (url) => {
      if (Router.asPath !== url && changed && !window.confirm(message)) {
        // Router.events.emit('routeChangeError');
        setTimeout(() => {
          Router.router.abortComponentLoad();
          // Router.replace(Router, Router.asPath);
        });
        // eslint-disable-next-line no-throw-literal
        // throw 'Abort route change. Please ignore this error.';
      }
    };
    */

    const beforeunload = (e) => {
      if (changed) {
        e.preventDefault();
        e.returnValue = confirm;
        return confirm;
      }

      return null;
    };

    // Restore if running from next.js
    // Router.events.on('routeChangeStart', routeChangeStart);
    window.addEventListener("beforeunload", beforeunload);

    return () => {
      // Restore if running from next.js
      // Router.events.off('routeChangeStart', routeChangeStart);
      window.removeEventListener("beforeunload", beforeunload);
    };
  }, [changed, confirm]);

  return setConfirm;
}
