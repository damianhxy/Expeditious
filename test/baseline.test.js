const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, boot, Client, PASSWORD } = require("./helpers/app.js");

describe("CSRF", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  async function visitor() {
    const client = new Client(app.baseUrl);
    await client.get("/users/login");
    return client;
  }

  test("a POST without a token is refused with 403", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/users/login", {
      form: { username: "x", password: "y" },
    });
    assert.equal(res.status, 403);
  });

  test("a wrong token is refused with 403", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/users/login", {
      form: { username: "x", password: "y" },
      headers: { "x-csrf-token": "not-the-token" },
    });
    assert.equal(res.status, 403);
  });

  test("a token in the query string is refused with 403", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/users/login?_csrf=" + client.csrfToken, {
      form: { username: "x", password: "y" },
    });
    assert.equal(res.status, 403);
  });

  test("the token in the X-CSRF-Token header is accepted", async () => {
    const client = await visitor();
    const res = await client.post("/users/login", { username: "x", password: "y" });
    assert.equal(res.status, 302);
  });

  test("a bodyless POST with the header token is neither 403 nor 500", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/users/login", {
      headers: { "x-csrf-token": client.csrfToken },
    });
    assert.equal(res.status, 302);
  });

  test.todo(
    "3.5 forms, bodyless and multipart CSRF correct: a form POST with the token in the _csrf field is accepted (open PR #1)",
  );
  test.todo(
    "3.7 app-level 4-arg error handler: a CSRF failure shows a short message, no stack trace (open PR #1)",
  );
});

describe("session secret", () => {
  test("a missing SESSION_SECRET stops startup with exit 1", async () => {
    const { code, output } = await boot({ SESSION_SECRET: "" });
    assert.equal(code, 1);
    assert.match(output, /FATAL: SESSION_SECRET/);
  });

  test.todo(
    "3.3 placeholder/short secret refused: a short or .env.example SESSION_SECRET stops startup with exit 1",
  );
});

describe("rate limits", () => {
  test("the 21st sign-in attempt within 15 minutes gets 429", async () => {
    const app = await start();
    try {
      const client = new Client(app.baseUrl);
      await client.get("/");
      for (let i = 1; i <= 20; i++) {
        const res = await client.post("/users/login", { username: "x", password: PASSWORD });
        assert.equal(res.status, 302, `attempt ${i}`);
      }
      const res = await client.post("/users/login", { username: "x", password: PASSWORD });
      assert.equal(res.status, 429);
    } finally {
      await app.stop();
    }
  });

  test.todo(
    "3.4 auth limiter POST-only: 25 loads of /users/login get no 429 (the limiter counts GETs, and the app-wide limiter counts static files)",
  );
});

describe("production mode", () => {
  test("NODE_ENV=production boots and serves the home page", async () => {
    const app = await start({ NODE_ENV: "production" });
    try {
      assert.equal((await fetch(app.baseUrl + "/")).status, 200);
    } finally {
      await app.stop();
    }
  });

  test.todo(
    "3.4 TRUST_PROXY for the Secure cookie: with NODE_ENV=production behind an HTTPS proxy the session cookie is issued, Secure",
  );
});

describe("responses", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("an unknown path is 404", async () => {
    const res = await fetch(app.baseUrl + "/no-such-page");
    assert.equal(res.status, 404);
    assert.equal(await res.text(), "Not Found.");
  });

  test("static files are served", async () => {
    const res = await fetch(app.baseUrl + "/css/style.css");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/css/);
  });

  test("pages carry helmet's headers (CSP is off)", async () => {
    const res = await fetch(app.baseUrl + "/");
    assert.equal(res.headers.get("content-security-policy"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("the session cookie is HttpOnly and SameSite=Lax", async () => {
    const res = await fetch(app.baseUrl + "/");
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("connect.sid="));
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  test("every page has a CSRF meta tag", async () => {
    for (const url of ["/", "/search", "/users/login", "/users/signup", "/users/leaderboards"]) {
      const text = await (await fetch(app.baseUrl + url)).text();
      assert.match(text, /<meta name="csrf-token" content="[^"]+"/, url);
    }
  });
});
