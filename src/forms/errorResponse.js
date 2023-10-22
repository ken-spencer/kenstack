import { NextResponse } from "next/server";

export default function errorResponse(message, payload = {}) {
  const response = NextResponse.json({
    type: "error",
    message,
    payload,
  });

  return response;
}
