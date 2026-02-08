import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import { getConfig } from "../config";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const config = getConfig();
  const dbPath = path.join(config.dataDir, "xsnap.db");

  // Ensure the data directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  _db = drizzle(sqlite);

  // Auto-migrate on first connection
  const migrationsDir = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsDir)) {
    migrate(_db, { migrationsFolder: migrationsDir });
  }

  return _db;
}
