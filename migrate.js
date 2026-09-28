const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const nedbPath = process.env.NEDB_PATH || path.join(__dirname, "database", "users");
const sqlitePath = process.env.DB_PATH || path.join(__dirname, "database", "expeditious.db");

function readUsers(filePath) {
  const seen = new Map();
  const contents = fs.readFileSync(filePath, "utf8");

  contents.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;

    let doc;
    try {
      doc = JSON.parse(line);
    } catch (err) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${err.message}`, { cause: err });
    }

    // NeDB journals also contain index metadata, which is not a user record.
    if (doc.$$indexCreated || doc.$$indexRemoved) return;
    if (typeof doc._id !== "string" || !doc._id) {
      throw new Error(`Missing document id on line ${index + 1}`);
    }
    if (doc.$$deleted === true) {
      seen.delete(doc._id);
      return;
    }
    seen.set(doc._id, doc);
  });

  const users = [...seen.values()];
  const usernames = new Set();
  users.forEach((user) => {
    if (
      typeof user.name !== "string" ||
      !user.name ||
      typeof user.username !== "string" ||
      !user.username ||
      typeof user.hash !== "string" ||
      !user.hash ||
      typeof user.salt !== "string" ||
      !user.salt ||
      !Number.isFinite(user.joined)
    ) {
      throw new Error(`Invalid user record ${user._id}`);
    }
    if (usernames.has(user.username)) throw new Error(`Duplicate username ${user.username}`);
    usernames.add(user.username);

    if (user.visited !== undefined && !Array.isArray(user.visited)) {
      throw new Error(`Invalid visited list for ${user.username}`);
    }
    (user.visited || []).forEach((visit) => {
      if (!visit || typeof visit.id !== "string" || !visit.id || !Number.isFinite(visit.time)) {
        throw new Error(`Invalid visit for ${user.username}`);
      }
    });
  });

  return users;
}

function serializePreferences(preferences) {
  if (preferences === undefined || preferences === null) return JSON.stringify({ radius: 500 });
  if (typeof preferences === "string") {
    JSON.parse(preferences);
    return preferences;
  }
  return JSON.stringify(preferences);
}

console.log("Reading NeDB database from", nedbPath);
const users = readUsers(nedbPath);
console.log("Found", users.length, "users in NeDB");
console.log("Migrating into SQLite database at", sqlitePath);

const db = new Database(sqlitePath);
try {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        preferences TEXT NOT NULL DEFAULT '{"radius":500}',
        joined INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS visited (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        location_id TEXT NOT NULL,
        name TEXT DEFAULT '',
        visited_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, location_id)
      );
    `);

    const visitedColumns = db.pragma("table_info(visited)");
    if (!visitedColumns.some((column) => column.name === "name")) {
      db.exec("ALTER TABLE visited ADD COLUMN name TEXT DEFAULT ''");
    }

    const upsertUser = db.prepare(`
      INSERT INTO users (name, username, hash, salt, preferences, joined)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        hash = excluded.hash,
        salt = excluded.salt,
        preferences = excluded.preferences,
        joined = excluded.joined
    `);
    const findUser = db.prepare("SELECT id FROM users WHERE username = ?");
    const upsertVisit = db.prepare(`
      INSERT INTO visited (user_id, location_id, name, visited_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, location_id) DO UPDATE SET
        name = excluded.name,
        visited_at = excluded.visited_at
    `);

    users.forEach((user) => {
      upsertUser.run(
        user.name,
        user.username,
        user.hash,
        user.salt,
        serializePreferences(user.preferences),
        user.joined,
      );
      const newId = findUser.get(user.username).id;
      (user.visited || []).forEach((visit) => {
        upsertVisit.run(newId, visit.id, visit.name || "", visit.time);
      });
      console.log("  Migrated", user.username, "with", (user.visited || []).length, "visits");
    });
  });

  migrate();
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  console.log("Migration complete. Total users:", count.count);
} finally {
  db.close();
}
