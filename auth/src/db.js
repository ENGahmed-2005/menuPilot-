/* db.js — one MySQL pool for Better Auth (through Kysely) and the gates' own queries.
   All times are UTC, as in Laravel (config/app.php timezone). */
import { createPool } from "mysql2";
import { Kysely, MysqlDialect } from "kysely";
import { config } from "./config.js";

const pool = createPool({
  ...config.database,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  timezone: "Z",
  dateStrings: false,
  charset: "utf8mb4_unicode_ci",
  supportBigNumbers: true,
  bigNumberStrings: false,
});
// TIMESTAMP columns (users.login_locked_until…) follow the session time zone.
pool.on("connection", (connection) => connection.query("SET time_zone = '+00:00'"));

export const db = new Kysely({ dialect: new MysqlDialect({ pool }) });

export const closeDb = () => db.destroy();
