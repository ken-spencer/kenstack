import { NextResponse } from "next/server";

export default function successResponse(message, payload = {}) {
  const response = NextResponse.json({
    type: "success",
    message,
    payload,
  });

  return response;
}
