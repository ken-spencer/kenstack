import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import React from "react";
import { render } from "@react-email/render";

import apiAction from "@kenstack/server/apiAction";
import Session from "@kenstack/server/Session";

import forgottenPasswordAction from "./forgottenPasswordAction";

const API = (session, props) => {
  if (!(session instanceof Session)) {
    throw Error("argument 1 must be a valid session object");
  }

  const POST = async (request) => {
    return await apiAction(forgottenPasswordAction, request, {
      ...props,
      session,
      roles: ["ANONYMOUS"],
    });
  };

  const GET = async (request) => {
    if ((await session.hasRole("ADMIN")) !== true) {
      notFound();
    }

    /*
    const user = new User({
      email: "test@test.com",
      first_name: "Test",
      last_name: "User",
    });
    */

    const Email = props.Email;
    const emailElement = React.createElement(
      Email,
      {
        name: "Test Name",
        ip: request.ip,
        city: "Houston",
        country: "United States",
        region: "Texas",
      },
      null,
    );

    const html = render(emailElement);

    return new NextResponse(html, {
      headers: { "content-type": "text/html" },
    });
  };

  return { POST, GET };
};

export default API;
