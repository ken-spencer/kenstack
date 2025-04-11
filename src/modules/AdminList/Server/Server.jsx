import "server-only";

import Authenticate from "@kenstack/server/Authenticate";
import { notFound } from "next/navigation";

import Session from "@kenstack/server/Session";
import clientModel from "@kenstack/client/Model";

import { ServerProvider } from "@kenstack/server/context";
import load from "../api/load";

// import { cookies } from "next/headers";

import Notice from "@kenstack/components/Notice";
import errorLog from "@kenstack/log/error";

export default async function Server({
  children,
  session,
  admin,
  model,
  slug,
}) {
  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  return (
    <Authenticate session={session} roles={["ADMIN"]}>
      <Query session={session} admin={admin} model={model} slug={slug}>
        {children}
      </Query>
    </Authenticate>
  );
}

async function Query({ session, model, admin, slug, children }) {
  // we may use slug later for pagination or some other link. 404 for now.
  if (slug) {
    notFound();
  }

  const claims = await session.getClaims();

  // const cookieStore = await cookies();
  // const key = "admin-list-" + admin.modelName;
  // const sortCookie = cookieStore.get(key + "Sort");
  // const keywordsCookie = cookieStore.get(key + "Keywords") || "";



  // const sortBy = sortCookie
  //   ? [...sortCookie.value.split(","), "_id", "desc"]
  //   : ["meta.createdAt", "desc", "_id", "desc"];
  // const keywords = keywordsCookie ? keywordsCookie.value : "";

  
  const keyGen = (key) => `admin-${key }-${admin.modelName}`;
  let [keywords, sortBy] = await session.get([
      keyGen("keywords"),
      keyGen("sortBy"),
    
  ])

  keywords = keywords ?? "";
  sortBy = sortBy ?? ["meta.createdAt", "desc", "_id", "desc"];

  let initialData;
  try {
    initialData = await load({ sortBy, keywords }, { model, admin, session });
  } catch (e) {
    errorLog(e, "Problem loading admin list");
    return (
      <Notice error="There was an unexpected problem loading admin data. Please try again later." />
    );
  }

  return (
    <ServerProvider
      list={true}
      name={model.modelName}
      claims={claims}
      sortBy={sortBy}
      keywords={keywords}
      initialData={initialData}
    >
      {children}
    </ServerProvider>
  );
}
