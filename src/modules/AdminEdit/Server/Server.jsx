import "server-only";

import React from "react";
import Authenticate from "@kenstack/server/Authenticate";

import Session from "@kenstack/server/Session";
import clientModel from "@kenstack/client/Model";

import errorLog from "@kenstack/log/error";
import Notice from "@kenstack/components/Notice";
import { notFound } from "next/navigation";

import { ServerProvider } from "@kenstack/server/context";
import load from "../api/load";

export default async function Server({
  children,
  session,
  admin,
  model,
  id,
  // params: { id },
}) {
  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  if (admin.modelName !== model.modelName) {
    throw Error(
      `Model name mismatch client: ""${admin.modelName}"",  server: ""${model.modelName}""`,
    );
  }

  return (
    <Authenticate session={session} roles={["ADMIN"]}>
      <Query id={id} model={model} admin={admin} session={session}>
        {children}
      </Query>
    </Authenticate>
  );
}

async function Query({ session, id, model, admin, children }) {
  const claims = await session.getClaims();

  let isNew = false;

  if (id === "new") {
    isNew = true;
    id = null;
  } else if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    notFound();
  }

  let doc, previous, next;
  // const select = admin.getPaths();
  if (isNew == false) {
    let result;
    try {
      result = await load({ admin, model, id });
      // row = await model.findById(id).select(select);
    } catch (e) {
      errorLog(e, "Problem loading admin row");
      return (
        <Notice error="There was an unexpected problem loading admin data. Please try again later." />
      );
    }

    ({ doc, previous, next } = result);

    if (!doc) {
      notFound();
    }

    // dto = doc.toAdminDTO(admin);
  }

  const modelPaths = Object.keys(model.schema.paths);

  return (
    <ServerProvider
      edit={true}
      isNew={isNew}
      id={id}
      row={doc}
      previous={previous}
      next={next}
      userId={claims.sub}
      modelPaths={modelPaths}
    >
      {children}
    </ServerProvider>
  );

  /*
  return React.Children.map(children, child => {
    return React.cloneElement(child, { 
      hasAdminEditServer: true,
      row: dto,
      isNew,
      id,
    });

  });
  if (React.isValidElement(children)) {
    console.log('bah', id);
    return React.cloneElement(children, { 
      hasAdminEditServer: true,
      row: dto,
      isNew,
      id,
    });
  }

  return (
    <Alert severity="error">
      Admin edit server must have an Admin Edit Client as a child
    </Alert>
  );
  */
}
