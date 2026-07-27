const bcryptjs = require("bcryptjs");
const db = require("../database");

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

const tableInfo = db.pragma("table_info(visited)");
if (!tableInfo.some((col) => col.name === "name")) {
  db.exec("ALTER TABLE visited ADD COLUMN name TEXT DEFAULT ''");
}

const PUBLIC_FIELDS = "id, name, username, preferences, joined";

const stmts = {
  insertUser: db.prepare("INSERT INTO users (name, username, hash, salt, joined) VALUES (?, ?, ?, ?, ?)"),
  findUserByUsername: db.prepare(`SELECT ${PUBLIC_FIELDS}, hash FROM users WHERE username = ?`),
  findUserById: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`),
  allUsers: db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users`),
  insertVisited: db.prepare(
    "INSERT OR IGNORE INTO visited (user_id, location_id, name, visited_at) VALUES (?, ?, ?, ?)",
  ),
  getVisitedByUser: db.prepare(
    "SELECT location_id, name, visited_at FROM visited WHERE user_id = ? ORDER BY visited_at DESC",
  ),
  countVisitedByUser: db.prepare("SELECT user_id, COUNT(*) as count FROM visited GROUP BY user_id"),
};

function attachVisited(user) {
  user.visited = stmts.getVisitedByUser.all(user.id).map((v) => ({
    id: v.location_id,
    name: v.name,
    time: v.visited_at,
  }));
  return user;
}

exports.all = async function () {
  return stmts.allUsers.all().map(attachVisited);
};

exports.authenticate = async function (username, password) {
  const user = stmts.findUserByUsername.get(username);
  if (!user) throw new Error("User does not exist.");
  const match = await bcryptjs.compare(password, user.hash);
  if (!match) throw new Error("Wrong Password");
  return attachVisited(user);
};

exports.create = async function (name, username, password, password2) {
  if (password !== password2) throw new Error("Password mismatch.");
  const existing = stmts.findUserByUsername.get(username);
  if (existing) throw new Error("User already exists.");
  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(password, salt);
  const result = stmts.insertUser.run(name, username, hash, salt, Date.now());
  return stmts.findUserById.get(result.lastInsertRowid);
};

exports.generateLeaderboard = async function () {
  const counts = stmts.countVisitedByUser.all();
  const countMap = {};
  counts.forEach((c) => {
    countMap[c.user_id] = c.count;
  });

  const leaderboard = stmts.allUsers.all().map((u) => ({
    username: u.username,
    visited: countMap[u.id] || 0,
  }));

  leaderboard.sort((a, b) => {
    if (b.visited !== a.visited) return b.visited - a.visited;
    return a.username > b.username ? 1 : -1;
  });

  leaderboard.forEach((e, i) => {
    if (i === 0) {
      e.rank = 1;
    } else {
      e.rank = leaderboard[i - 1].rank + (e.visited !== leaderboard[i - 1].visited ? 1 : 0);
    }
  });

  return leaderboard;
};

exports.get = async function (id) {
  const user = stmts.findUserById.get(id);
  if (!user) return null;
  return attachVisited(user);
};

exports.addVisited = function (userid, locationid, name, time) {
  stmts.insertVisited.run(userid, locationid, name || "", time);
};
