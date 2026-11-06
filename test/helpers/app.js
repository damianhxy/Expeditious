// Starts the real app in a throwaway copy of the repo, so tests never touch ./database in the
// working tree. node_modules and public/ are symlinked. Google Places, LTA DataMall and
// Wikipedia are replaced by a local fake (fake-apis.js), so no network or API keys are needed.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const fakeApis = require("./fake-apis.js");

const repoRoot = path.resolve(__dirname, "..", "..");
const skip = new Set([".git", "node_modules", "public", "test"]);
const stubApis = path.join(__dirname, "stub-apis.js");

exports.PASSWORD = "test-password-123";
exports.SECRET = "s".repeat(48);
// Not a real key: the fake APIs only check that the app sends it.
exports.GOOGLE_API_KEY = "fake-google-key";
exports.LTA_ACCOUNT_KEY = "fake-lta-key";

function freePort() {
  return new Promise(function (resolve, reject) {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", function () {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "expeditious-test-"));
  for (const entry of fs.readdirSync(repoRoot)) {
    if (skip.has(entry) || entry.startsWith(".env")) continue;
    fs.cpSync(path.join(repoRoot, entry), path.join(dir, entry), {
      recursive: true,
      // database/ holds code (index.js) next to the local SQLite files; copy only the code.
      filter: (src) => !/\.db(-\w+)?$/.test(src),
    });
  }
  fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(dir, "node_modules"), "dir");
  fs.symlinkSync(path.join(repoRoot, "public"), path.join(dir, "public"), "dir");
  return dir;
}

// index.js logs "Listening on port" right after calling listen(), so wait for the port itself.
// A TCP connect, not an HTTP request: the app-wide rate limiter counts every request.
async function waitForPort(port, child, output) {
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode !== null)
      throw Error("App exited with code " + child.exitCode + ":\n" + output());
    const open = await new Promise(function (resolve) {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => resolve(socket.end() && true));
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    if (Date.now() > deadline) throw Error("App did not start:\n" + output());
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function launch(dir, env) {
  // cwd must be the (copied) repo root: express.static("public") and the views directory are
  // resolved against the working directory.
  return spawn(process.execPath, ["-r", stubApis, "index.js"], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SESSION_SECRET: exports.SECRET,
      GOOGLE_API_KEY: exports.GOOGLE_API_KEY,
      LTA_ACCOUNT_KEY: exports.LTA_ACCOUNT_KEY,
      DB_PATH: path.join(dir, "database", "test.db"),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// Resolves once the server accepts connections. `env` adds or overrides variables. `app.api`
// is the fake API server (requests made, per-path handlers).
exports.start = async function (env = {}) {
  const dir = makeSandbox();
  const api = await fakeApis.start();
  const port = await freePort();
  const child = launch(dir, { PORT: String(port), STUB_API_URL: api.url, ...env });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  try {
    await waitForPort(port, child, () => output);
  } catch (err) {
    child.kill();
    await api.stop();
    throw err;
  }
  return {
    dir,
    api,
    baseUrl: "http://127.0.0.1:" + port,
    output: () => output,
    stop: async function () {
      if (child.exitCode === null) {
        await new Promise(function (resolve) {
          child.once("exit", resolve);
          child.kill();
        });
      }
      await api.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
};

// Runs the app until it exits or `ms` passes; resolves to { code, output } (code null if it
// was still running).
exports.boot = async function (env, ms = 3000) {
  const dir = makeSandbox();
  const child = launch(dir, { PORT: String(await freePort()), ...env });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const code = await new Promise(function (resolve) {
    const timer = setTimeout(() => resolve(null), ms);
    child.once("exit", (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });
  if (child.exitCode === null) {
    await new Promise(function (resolve) {
      child.once("exit", resolve);
      child.kill();
    });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return { code, output };
};

function decode(s) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#x3D;/g, "=")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// What a rendered page shows: the flash messages, the signed-in user's profile link, and the
// cards the main views render.
exports.page = function (text) {
  const read = (re) => {
    const m = text.match(re);
    return m ? decode(m[1].trim()) : undefined;
  };
  const all = (re) => [...text.matchAll(re)].map((m) => decode(m[1].trim()));
  const profileId = read(/<a href="\/users\/(\d+)" class="button right">/);
  return {
    error: read(/border-left: 4px solid rgba\(192,57,43,1.0\);"\s*>\s*<p>([^<]*)<\/p>/),
    success: read(/border-left: 4px solid rgba\(46,204,113,1.0\);"\s*>\s*<p>([^<]*)<\/p>/),
    userId: profileId === undefined ? undefined : Number(profileId),
    signedIn: profileId !== undefined,
    // Home feed and profile: "<user> visited <place>".
    activities: [
      ...text.matchAll(
        /<span class="name">([^<]*)<\/span>\s*visited\s*<span class="name">([^<]*)<\/span>/g,
      ),
    ].map((m) => ({ user: decode(m[1]), place: decode(m[2]) })),
    // Leaderboard rows, in order: { rank, username, visited }.
    leaderboard: [
      ...text.matchAll(
        /<section class="icon">\s*(\d+)\s*<\/section>\s*<section class="main">\s*<section class="left">\s*([^<]*?)\s*<\/section>\s*<section class="right">\s*(\d+)\s*<\/section>/g,
      ),
    ].map((m) => ({ rank: Number(m[1]), username: decode(m[2]), visited: Number(m[3]) })),
    // Search results and the popular list: links to place pages.
    placeLinks: all(/<a href="\/locations\/([^"]+)">/g),
  };
};

// A tiny browser stand-in: keeps cookies and reads the CSRF token from the page's
// <meta name="csrf-token">, which the forms' hidden _csrf field and the page script also use.
exports.Client = class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
    this.csrfToken = null;
  }

  get cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => k + "=" + v)
      .join("; ");
  }

  async request(method, url, { form, headers = {} } = {}) {
    const init = {
      method,
      redirect: "manual",
      headers: { cookie: this.cookieHeader, ...headers },
    };
    if (form) {
      init.body = new URLSearchParams(form).toString();
      init.headers["content-type"] = "application/x-www-form-urlencoded";
    }
    const res = await fetch(this.baseUrl + url, init);
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      if (/expires=thu, 01 jan 1970/i.test(cookie)) delete this.cookies[name];
      else this.cookies[name] = pair.slice(pair.indexOf("=") + 1);
    }
    const text = await res.text();
    const token = text.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (token) this.csrfToken = token[1];
    return {
      status: res.status,
      headers: res.headers,
      text,
      location: res.headers.get("location"),
    };
  }

  get(url) {
    return this.request("GET", url);
  }

  // A POST the way the page script (public/js/main.js) sends one: urlencoded fields, with the
  // CSRF token in the X-CSRF-Token header. On master the HTML forms, which send the token in
  // the _csrf field, are refused (see the test.todo entries), so the tests drive the form
  // routes this way too.
  post(url, fields = {}) {
    return this.request("POST", url, { form: fields, headers: { "x-csrf-token": this.csrfToken } });
  }

  // A POST the way the HTML forms send one: the token in the _csrf field.
  postForm(url, fields = {}) {
    return this.request("POST", url, { form: { _csrf: this.csrfToken, ...fields } });
  }

  // Posts, then loads the redirect target and returns what it shows.
  async postAndFollow(url, fields) {
    const res = await this.post(url, fields);
    if (res.status !== 302) throw Error(`POST ${url}: expected a redirect, got ${res.status}`);
    const next = await this.get(res.location);
    return { location: res.location, ...exports.page(next.text) };
  }

  // Registers with the sign-up form's fields; any field can be overridden.
  async signUp(username, fields = {}) {
    await this.get("/users/signup");
    return this.postAndFollow("/users/signup", {
      name: "User " + username,
      username,
      password: exports.PASSWORD,
      password2: fields.password ?? exports.PASSWORD,
      ...fields,
    });
  }

  async signIn(username, password = exports.PASSWORD) {
    await this.get("/users/login");
    return this.postAndFollow("/users/login", { username, password });
  }

  // POST /locations/mark as a visit at the given coordinates; resolves to the response.
  markVisited(lat = 1.3001, long = 103.8001) {
    return this.post("/locations/mark", { lat: String(lat), long: String(long) });
  }
};
