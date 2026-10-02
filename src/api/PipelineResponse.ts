import { NextResponse } from "next/server";

import type { UserInfoResult } from "@kenstack/auth/api";

export class PipelineResponse {
  private _payload: Record<string, unknown> = {};
  private _returnUser = false;
  private _stopped = false;
  private _status = 200;

  public readonly headers: NextResponse["headers"] = new NextResponse(null, {
    status: 200,
  }).headers;

  public readonly cookies: NextResponse["cookies"] = new NextResponse(null, {
    status: 200,
  }).cookies;

  get stopped() {
    return this._stopped;
  }

  // Set by `success({ returnUser: true })` and cleared by any later payload, so the pipeline adds the
  // user info only to the success that asked for it.
  get returnUser() {
    return this._returnUser;
  }

  status(code: number) {
    this._status = code;
    return this;
  }

  json(obj: Record<string, unknown>) {
    this._payload = obj;
    this._returnUser = false;
    return this;
  }

  final(obj: { success?: never; error?: never } & Record<string, unknown>) {
    this.json(obj);
    this._stopped = true;
    return this;
  }

  redirectToLogin() {
    const message = "You are no longer logged in. Please log in and try again.";
    return this.error({
      message,
      redirect: `/login?loginMessage=${encodeURIComponent(message)}`,
      status: 401,
    });
  }

  // `returnUser` is for a request that changed the user or session: the pipeline adds this request's
  // fresh `userInfo`, which Kenstack's Form adopts as this tab's own change.
  success<TPayload extends Record<string, unknown> = Record<string, unknown>>({
    message,
    returnUser = false,
    ...payload
  }: { message?: string; returnUser?: boolean } & TPayload) {
    this.json({
      status: "success",
      message,
      ...payload,
    });
    this._returnUser = returnUser;
    return this;
  }
  error(
    arg:
      | string
      | {
          code?: string;
          details?: Record<string, unknown>;
          message: string;
          status?: number;
          formErrors?: string[];
          fieldErrors?: Record<string, string | string[]>;
          redirect?: string;
        },
  ) {
    const { status = 422, ...payload } =
      typeof arg === "string" ? { message: arg } : arg;

    this.status(status);
    return this.final({ status: "error", ...payload });
  }

  toNextResponse(userInfo?: UserInfoResult) {
    const res = NextResponse.json(
      userInfo ? { ...this._payload, userInfo } : this._payload,
      { status: this._status },
    );
    for (const [key, value] of this.headers.entries()) {
      res.headers.set(key, value);
    }
    for (const cookie of this.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return res;
  }
}
