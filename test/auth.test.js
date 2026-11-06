const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, Client, page, PASSWORD } = require("./helpers/app.js");

describe("sign-up", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("a new user is signed in on the home page", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.signUp("alice");
    assert.equal(res.location, "/");
    assert.equal(res.signedIn, true);
    assert.equal(res.error, undefined);
  });

  test("a taken username is refused", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("bob");
    const again = new Client(app.baseUrl);
    const res = await again.signUp("bob");
    assert.equal(res.location, "/users/signup");
    assert.equal(res.signedIn, false);
    assert.equal(res.error, "User already exists.");
  });

  for (const [label, fields, message] of [
    ["mismatched passwords", { password2: "something-else" }, "Passwords do not match"],
    ["a short password", { password: "12345", password2: "12345" }, /at least 6 characters/],
    ["a non-alphanumeric username", { username: "a-b" }, "Username must be alphanumeric"],
    ["a missing name", { name: "" }, "Name is required"],
  ]) {
    test(`${label} is refused with a message`, async () => {
      const client = new Client(app.baseUrl);
      const res = await client.signUp("carol", fields);
      assert.equal(res.location, "/users/signup");
      assert.equal(res.signedIn, false);
      if (message instanceof RegExp) assert.match(res.error, message);
      else assert.equal(res.error, message);
    });
  }

  test.todo(
    "3.5 forms, bodyless and multipart CSRF correct: the sign-up form (token in the _csrf field) signs the user up (open PR #1)",
  );
});

describe("sign-in and sign-out", () => {
  let app;
  before(async () => {
    app = await start();
    await new Client(app.baseUrl).signUp("dave");
  });
  after(() => app.stop());

  test("the right password signs in", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.signIn("dave");
    assert.equal(res.location, "/");
    assert.equal(res.signedIn, true);
  });

  test("a wrong password is refused", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.signIn("dave", "wrong-password");
    assert.equal(res.location, "/users/login");
    assert.equal(res.signedIn, false);
    assert.equal(res.error, "Wrong Password");
  });

  test("an unknown user is refused", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.signIn("nobody");
    assert.equal(res.location, "/users/login");
    assert.equal(res.signedIn, false);
    assert.equal(res.error, "User does not exist.");
  });

  test.todo(
    "3.9 generic sign-in failure message: an unknown user and a wrong password get the same message",
  );

  test("GET /users/logout signs the user out", async () => {
    const client = new Client(app.baseUrl);
    await client.signIn("dave");
    const res = await client.get("/users/logout");
    assert.equal(res.status, 302);
    assert.equal(res.location, "/");
    const home = page((await client.get("/")).text);
    assert.equal(home.signedIn, false);
  });

  test.todo(
    'sign-out message: "Successfully signed out." is shown after signing out (passport 0.7\'s logout regenerates the session and drops it)',
  );

  test("signing out needs a signed-in user", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.get("/users/logout");
    assert.equal(res.location, "/");
    assert.equal(page((await client.get("/")).text).error, "Unauthorized.");
  });

  test.todo(
    "3.6 POST sign-out + destroy: GET /users/logout is 404; a POST with a token signs out and the old cookie is no longer signed in (open PR #1)",
  );
  test.todo(
    "3.5 forms, bodyless and multipart CSRF correct: the sign-in form (token in the _csrf field) signs the user in (open PR #1)",
  );
});

describe("profiles and the leaderboard", () => {
  let app;
  let erin;
  let frank;
  before(async () => {
    app = await start();
    erin = new Client(app.baseUrl);
    frank = new Client(app.baseUrl);
    await erin.signUp("erin", { name: "Erin Example" });
    await frank.signUp("frank");
  });
  after(() => app.stop());

  test("a profile shows the name, username and visit count", async () => {
    const id = page((await erin.get("/")).text).userId;
    const res = await new Client(app.baseUrl).get("/users/" + id);
    assert.equal(res.status, 200);
    assert.match(res.text, /<h1>Erin Example<\/h1>/);
    assert.match(res.text, /<i class="fa fa-user"><\/i>\s*erin</);
    assert.match(res.text, /Joined \d+\w\w \w+ \d{4}/);
    assert.match(res.text, /Visited 0 places/);
  });

  test("an unknown profile is 404", async () => {
    const res = await new Client(app.baseUrl).get("/users/9999");
    assert.equal(res.status, 404);
    assert.equal(res.text, "User not found.");
  });

  test("the sign-out link is shown on profiles to signed-in users only", async () => {
    const id = page((await erin.get("/")).text).userId;
    assert.match((await erin.get("/users/" + id)).text, /href="\/users\/logout"/);
    assert.doesNotMatch(
      (await new Client(app.baseUrl).get("/users/" + id)).text,
      /href="\/users\/logout"/,
    );
  });

  test("visits appear on the profile, the home feed and the leaderboard", async () => {
    assert.equal((await frank.markVisited()).text, "ok");
    const id = page((await frank.get("/")).text).userId;

    const profile = await frank.get("/users/" + id);
    assert.match(profile.text, /Visited 2 places/);
    assert.deepEqual(
      page(profile.text)
        .activities.map((a) => a.place)
        .sort(),
      ["Alpha Park", "Beta Museum"],
    );

    const feed = page((await erin.get("/")).text).activities;
    assert.deepEqual(
      feed.map((a) => a.user),
      ["frank", "frank"],
    );

    const board = page((await erin.get("/users/leaderboards")).text).leaderboard;
    assert.deepEqual(board, [
      { rank: 1, username: "frank", visited: 2 },
      { rank: 2, username: "erin", visited: 0 },
    ]);
  });

  test("leaderboard ties share a rank and sort by username", async () => {
    const george = new Client(app.baseUrl);
    await george.signUp("george");
    await george.markVisited();
    const board = page((await george.get("/users/leaderboards")).text).leaderboard;
    assert.deepEqual(board, [
      { rank: 1, username: "frank", visited: 2 },
      { rank: 1, username: "george", visited: 2 },
      { rank: 2, username: "erin", visited: 0 },
    ]);
  });

  test("a signed-out visitor sees no activity feed", async () => {
    const res = await new Client(app.baseUrl).get("/");
    assert.match(res.text, /Login to see activity/);
    assert.deepEqual(page(res.text).activities, []);
  });

  test.todo(
    'profile visit count: "Visited N places" counts every visit, like the leaderboard, not only the last 24 hours (open PR #5)',
  );
});

describe("passwords", () => {
  test("the stored hash is bcrypt, not the password", async () => {
    const app = await start();
    try {
      await new Client(app.baseUrl).signUp("henry");
      const Database = require("better-sqlite3");
      const db = new Database(require("node:path").join(app.dir, "database", "test.db"), {
        readonly: true,
      });
      const row = db.prepare("SELECT hash FROM users WHERE username = ?").get("henry");
      db.close();
      assert.match(row.hash, /^\$2[aby]\$10\$/);
      assert.ok(!row.hash.includes(PASSWORD));
    } finally {
      await app.stop();
    }
  });
});
