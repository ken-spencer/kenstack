import "server-only";

import Session from "@kenstack/server/Session";
import Authenticate from "@kenstack/server/Authenticate";

import QueryProvider from "../QueryProvider";
import Provider from "../Provider";
import Library from "../Library";

export default async function Server({
  children,
  session,
  apiPath = "/admin/image-library/api",
}) {
  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  return (
    <Authenticate session={session} roles={["ADMIN"]}>
      <QueryProvider>
        <Provider mode="image" apiPath={apiPath}>
          <Library />
        </Provider>
      </QueryProvider>
    </Authenticate>
  );
}
