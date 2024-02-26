import { NextResponse } from "next/server";

export default async function clientErrorLog(req) {

  const referer = req.headers.get("referer");

  const url = new URL(referer);
  // only accept traffic that originates from the current website.     
  if (url.origin !==  req.headers.get("origin")) {
    return NextResponse.json({success: true});
  }

  const json = await req.json();

  if (!json || !json.error) {
    return NextResponse.json({success: true});
  }

  const message = `
There was a client side issue on: ${referer}
${ json?.error?.message }
${ req.headers.get("user-agent") }


Stack trace: 
${ json?.error?.stack }

Component Stack: 
${json.componentStack}
  `;


  // eslint-disable-next-line no-console
  console.error(message);

  return NextResponse.json({success: true});
}
