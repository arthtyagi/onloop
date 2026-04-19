import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleClient | null = null;

export const db = new Proxy({} as DrizzleClient, {
  get(_, prop) {
    if (!_db) {
      if (!process.env.POSTGRES_URL) {
        throw new Error("POSTGRES_URL environment variable is required");
      }
      const client = postgres(process.env.POSTGRES_URL, {
        prepare: false,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client, { schema });
    }
    return Reflect.get(_db, prop);
  },
});
