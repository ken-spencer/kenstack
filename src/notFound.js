import { NextResponse } from "next/server";

export default async function notFound(origin) {
  const fetchRes = await fetch(origin + "/404");
  const html = await fetchRes.text();

  console.log(fetchRes.status, fetchRes.statusText);
  const response = new NextResponse(html, {
    status: 404,
    statusText: "Not Found",
    headers: { "content-type": "text/html" },
  });

  return response;
}
