/* Compile-time @app/db binding for standalone Kenstack tooling. */

import type { createDb } from "@kenstack/db";

export const db = {} as ReturnType<typeof createDb>;
