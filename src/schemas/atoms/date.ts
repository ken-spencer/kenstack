import * as z from "zod";

type DateReturn<T> = T extends "client" ? z.ZodType<string> : z.ZodType<Date>;

function date<T extends "client" | "server">(mode: T): DateReturn<T> {
  if (mode === "client") {
    return z
      .transform((val) => {
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val;
      })
      .pipe(z.string()) as unknown as DateReturn<T>;
  }

  return z
    .transform((val) => {
      if (typeof val === "string" && val.length) {
        return new Date(val);
      }

      return val;
    })
    .pipe(z.date()) as unknown as DateReturn<T>;
}

export default date;

export const x = date("server");
export type X = z.infer<typeof x>;
