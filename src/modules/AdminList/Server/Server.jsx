import "server-only";

import Authenticate from "@admin/server/Authenticate";

import Session from "@admin/server/Session";
import clientModel from "@admin/client/Model";
import ThemeProvider from "@admin/components/ThemeProvider";

import { ServerProvider } from "@admin/server/context";
import load from "../api/load";

import { cookies } from "next/headers";

import Alert from "@mui/material/Alert";
import errorLog from "@admin/log/error";


export default async function Server({ children, session, admin, model }) {
  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  return (
    <Authenticate session={session} roles={["ADMIN"]}>
      <ThemeProvider theme="dark">
        <Query session={session} admin={admin} model={model}>
          {children}
        </Query>
      </ThemeProvider>
    </Authenticate>
  );
}

async function Query({session, model, admin, children}) {
  const claims = await session.getClaims();
  
  const key = "admin-list-" + admin.modelName;
  const sortCookie = cookies().get(key + "Sort");
  const keywordsCookie = cookies().get(key + "Keywords") || "";

  const sortBy = sortCookie ? sortCookie.value : "";
  const keywords = keywordsCookie ? keywordsCookie.value : "";


  let initialData;
  try {
    initialData = await load({ sortBy, keywords }, { model, admin });
  } catch (e) {
    errorLog(e, "Problem loading admin list");
    return (
      <Alert severity="error">
        There was an unexpected problem loading admin data. Please try again
        later.
      </Alert>
    );
  }

  return (
    <ServerProvider claims={claims} sortBy={sortBy} keywords={keywords} initialData={initialData}>
      {children}
    </ServerProvider>
  )
}
