const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const nedbPath = path.join(__dirname, "database", "users");
const sqlitePath = path.join(__dirname, "database", "expeditious.db");

console.log("Reading NeDB database from", nedbPath);

const lines = fs.readFileSync(nedbPath, "utf8").trim().split("\n");
const seen = {};
lines.forEach((line) => {
  const doc = JSON.parse(line);
  seen[doc._id] = doc;
});
const users = Object.values(seen);
console.log("Found", users.length, "users in NeDB");

console.log("Creating SQLite database at", sqlitePath);
const db = new Database(sqlitePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
        visited_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, location_id)
    );
`);

const insertUser = db.prepare(
  "INSERT INTO users (name, username, hash, salt, preferences, joined) VALUES (?, ?, ?, ?, ?, ?)",
);
const insertVisited = db.prepare(
  "INSERT OR IGNORE INTO visited (user_id, location_id, visited_at) VALUES (?, ?, ?)",
);

const migrate = db.transaction(() => {
  users.forEach((user) => {
    const result = insertUser.run(
      user.name,
      user.username,
      user.hash,
      user.salt,
      JSON.stringify(user.preferences || { radius: 500 }),
      user.joined,
    );
    const newId = result.lastInsertRowid;
    console.log("  Migrated user", user.username, "(old:", user._id, "-> new:", newId + ")");

    if (user.visited && user.visited.length) {
      user.visited.forEach((v) => {
        insertVisited.run(newId, v.id, v.time);
      });
      console.log("    ->", user.visited.length, "visited locations");
    }
  });
});

migrate();

const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
console.log("Migration complete. Total users:", count.c);

db.close();
