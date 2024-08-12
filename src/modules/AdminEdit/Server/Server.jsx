import "server-only";

import React from "react";
import Authenticate from "@admin/server/Authenticate";

import Session from "@admin/server/Session";
import clientModel from "@admin/client/Model";
import ThemeProvider from "@admin/components/ThemeProvider";

import errorLog from "@admin/log/error";
import Alert from "@mui/material/Alert";
import { notFound } from "next/navigation";

import { ServerProvider } from "@admin/server/context";

export default async function Server({
  children,
  session,
  admin,
  model,
  params: { id },
}) {
  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  return (
    <Authenticate session={session} roles={["ADMIN"]}>
      <ThemeProvider theme="dark">
        <Query id={id} model={model} admin={admin} session={session}>
          {children}
        </Query>
      </ThemeProvider>
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

  let row, dto;
  const select = admin.getPaths();
  if (isNew == false) {
    try {
      row = await model.findById(id).select(select);
      // leanRow = await model.findById(id).select(select).lean();
    } catch (e) {
      errorLog(e, "Problem loading admin row");
      return (
        <Alert severity="error">
          There was an unexpected problem loading admin data. Please try again
          later.
        </Alert>
      );
    }

    if (!row) {
      notFound();
    }

    dto = row.toAdminDTO(select);
  }

  return (
    <ServerProvider isNew={isNew} id={id} row={dto} userId={claims.sub}>
      {children}
    </ServerProvider>
  );

  /*
  return React.Children.map(children, child => {
    console.log('foo bar', id);
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
