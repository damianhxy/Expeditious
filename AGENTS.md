# Expeditious

Express 5 + Handlebars "Singapore exploration app" that uses Google Places and LTA DataMall
data, submitted to Hackathon@SG 2015 (release `final-2015`). The home page finds the user's
position and lists popular places and carparks nearby; a place page shows Places details and a
Wikipedia summary; signed-in users mark places as visited and appear in the activity feed and
on the leaderboard. Users, visits and sessions are in SQLite (better-sqlite3) at
`database/expeditious.db` (or `DB_PATH`). The site is not deployed.

## Run and check

- Node: the version in `.node-version` (also the `engines` floor in `package.json`).
  `npm ci` may build better-sqlite3 with node-gyp, so it needs Python and `make` (slim Docker
  images lack them). On Docker use a Debian trixie image: bookworm's glibc is too old for
  better-sqlite3's prebuilt binary.
- `npm ci --engine-strict`, then copy `.env.example` to `.env` and set `SESSION_SECRET`, and
  `GOOGLE_API_KEY`, `LTA_ACCOUNT_KEY` and `LTA_USER_ID` for real data. Run `npm start` (or
  `npm run dev`) **from the repo root**.
- **Gate** (what CI runs; all must pass before a PR is ready):

  ```sh
  npm ci --engine-strict && npm run lint && npm run format:check && npm test && npm audit --omit=dev
  ```

- `npm test` boots the real `node index.js` in a temporary copy of the repo (your `database/` is
  never touched). `test/helpers/app.js` drives it over HTTP with a cookie-jar client that reads
  the CSRF token from `<meta name="csrf-token">`. Google Places, LTA DataMall and Wikipedia are
  never called: `test/helpers/stub-apis.js` is preloaded into the app and redirects its axios
  requests to the local fake in `test/helpers/fake-apis.js` (synthetic fixtures; it records each
  request). No network or API keys are needed. The app-wide rate limiter allows 100 requests and
  the sign-in/sign-up limiter 20 per 15 minutes, so a test file starts a new app per `describe`
  block.

## Where things live

- `index.js`: startup, helmet, both rate limiters. `controllers/settings.js`: env (port, secret
  check, API keys). `controllers/config.js`: middleware (static files, logging, sessions in
  SQLite, passport strategies, CSRF via csrf-sync, Handlebars helpers).
- `controllers/routes.js`: home feed, search, the 404 and 500 handlers.
  `controllers/users.js`: sign-in, sign-up, sign-out, profiles, leaderboard.
  `controllers/locations.js`: place pages and the `nearby`, `nearbyCarparks` and `mark` POSTs.
- `models/user.js`: SQLite schema and queries. `models/location.js`: the Places, LTA and
  Wikipedia requests (axios). `database/index.js`: the connection.
- `views/*.handlebars`; `public/js/main.js` (home page: position, nearby lists),
  `public/js/map.js` (place page map).
- `migrate.js`: a one-off importer for the old NeDB files. There is no data to import; leave it.
- `test/`: `node:test` suites; `test/helpers/` holds the harness.
- `.github/workflows/ci.yml`: checks `test (floor)`, `test (lts)` and `audit` on every PR and
  push to `master`, weekly on Mondays; a failing scheduled run opens a "Scheduled CI failed"
  issue. `dependabot.yml`: monthly grouped updates. `dependabot-auto-merge.yml`: patch and minor
  Dependabot PRs merge themselves once the required checks pass.

## Conventions

- Damian merges. Agents work on branches and open or update PRs; they never merge, close PRs,
  push to `master` or change repository settings.
- One problem per commit, one theme per PR. Imperative, sentence-case subjects with no prefix,
  except dependency commits: `fix(deps): update <pkg> <old> -> <new> (GHSA-…)`.
- Commit bodies say what was wrong (citing the commit that caused it), the fix, and how it was
  verified: the result before and after. A behavioural fix adds a test that fails before it.
- Don't force-push a pushed branch; add commits, and merge the base in to update it.
- Stacked PRs say so in the description and give the merge order.
- Known gaps are `test.todo` entries named after the item they miss. Fixing one means dropping
  `.todo` in the same PR.
- The CSRF form field is `_csrf`; scripts send the token in `X-CSRF-Token`.
- Tests never call the real APIs; add fixtures to `test/helpers/fake-apis.js` instead.
- Escape on output. In `public/js/`, everything inserted with `innerHTML` is escaped first.

## Decided against (don't re-propose)

- npm's audit "fix" for the dev-only eslint/minimatch advisory.
- Migrating old NeDB data into SQLite. There is no data worth migrating.
- Turning on a Content-Security-Policy as a side effect of another fix (helmet's CSP is off).

## Known issues (don't re-investigate)

- Every HTML form (sign-up, sign-in, search) gets 403: csrf-sync reads the token only from the
  `X-CSRF-Token` header, and the forms send `_csrf`. Pages rendered for a POST (search results)
  carry an empty token. A CSRF failure reaches Express's default handler, which shows a stack
  trace outside production (open PR #1).
- Sign-out is `GET /users/logout` (any site can log a user out) and the stored session is not
  destroyed (open PR #1). The "Successfully signed out." message is never shown: passport 0.7's
  `logout` regenerates the session it was stored in.
- Coordinates accept `Infinity`, `1e999` and out-of-range values; search terms are
  double-encoded (`Alpha+Park` reaches Places as `Alpha%2BPark`); a place's `javascript:`
  website is rendered as a link; `public/js/main.js` sends a function as the longitude in the
  nearby request, so "Popular Nearby" never fills; request-log dates get wrong ordinal suffixes
  ("4rd") (open PR #1).
- The profile's "Visited N places" counts only the last 24 hours, so it disagrees with the
  leaderboard (open PR #5). The profile list and the home feed are meant to show 24 hours.
- The server-side `GOOGLE_API_KEY` is rendered into the place page's HTML (photo URL in
  `views/place.handlebars`).
- A short or `.env.example` placeholder `SESSION_SECRET` boots; only an empty one is refused.
- With `NODE_ENV=production` the session cookie is `Secure` but `trust proxy` is never set, so
  behind an HTTPS proxy no cookie is issued and the rate limiters key everyone as one client.
- The auth limiter is mounted with `app.use("/users/login")` / `("/users/signup")`, so it counts
  page loads, and the app-wide limiter in `index.js` also counts static files.
- The leaderboard page is rendered without the user, so its header shows the sign-in icon to a
  signed-in user.
- Sign-in says "User does not exist." or "Wrong Password", revealing which usernames exist.
- `escapeHtml` in `public/js/main.js` doesn't escape quotes, but its output goes into
  attributes.
- A POST with no body to `/search` or `/locations/*` is a 500: Express 5 leaves `req.body`
  undefined.
- `findNearbyCarparks` ignores the position and radius and fetches the whole LTA carpark list;
  the LTA and Places endpoints are the 2015 ones and have not been checked against the live
  services.
- `public/` and `views/` are resolved against the working directory, so the app only starts
  from the repo root. `index.js` logs "Listening on port" before the port is bound.
- `res.status(4xx).redirect(...)` sends 302 (redirect overrides the status). Don't add more.
