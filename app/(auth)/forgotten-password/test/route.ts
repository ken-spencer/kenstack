import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'

import User from "models/User";
// import ForgottenPassword from "models/ForgottenPassword";

import React from "react"
import Email from "../Email";
import { render } from '@react-email/render';


export async function GET(request: Request) {

  // We only want to see this page in development
  if ( process.env.NODE_ENV !== "development") {
    notFound();
  }

  const user = new User({
    email: "test@test.com",
    first_name: "Test",
    last_name: "User",
  });


  const emailElement = React.createElement(Email, {
    name: user.getFullName(),
    ip: request.ip,
    city: "Houston",
    country: "United States",
    region: "Texas",
  }, null);

  const emailHtml = render(emailElement);

  return new NextResponse(
    emailHtml,
    { headers: { 'content-type': 'text/html' } }
  )

}
