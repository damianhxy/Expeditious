const assert = require("node:assert/strict");
const { describe, test, before, after, beforeEach } = require("node:test");
const { start, Client, page, GOOGLE_API_KEY, LTA_ACCOUNT_KEY } = require("./helpers/app.js");
const { NEARBY, DETAILS_PATH, CARPARKS_PATH, WIKI } = require("./helpers/fake-apis.js");

describe("place pages", () => {
  let app;
  before(async () => (app = await start()));
  beforeEach(() => app.api.reset());
  after(() => app.stop());

  test("a place shows its details and the Wikipedia summary", async () => {
    const res = await new Client(app.baseUrl).get("/locations/place-alpha");
    assert.equal(res.status, 200);
    assert.match(res.text, /<h1>Alpha Park<\/h1>/);
    assert.match(res.text, /<i class="fa fa-tree"><\/i> Park/);
    assert.match(res.text, /1 Alpha Road, Singapore 000001/);
    assert.match(res.text, /Monday: 7 AM - 7 PM, Tuesday: Closed/);
    assert.match(res.text, /Rating: 4.5/);
    assert.match(res.text, /<a href="https:\/\/alpha.example\/">/);
    assert.match(res.text, /Alpha Park is a synthetic park. It exists only in tests./);
    assert.match(res.text, /data-lat="1.3001"\s+data-long="103.8001"/);
    assert.match(res.text, /NOT LOGGED IN/);

    const [details] = app.api.calls(DETAILS_PATH);
    assert.equal(details.query.get("placeid"), "place-alpha");
    assert.equal(details.query.get("key"), GOOGLE_API_KEY);
    assert.equal(app.api.calls(WIKI)[0].query.get("titles"), "Alpha Park");
  });

  test("a failing Wikipedia lookup still renders the place", async () => {
    app.api.on(WIKI, (req, res) => res.writeHead(500).end());
    const res = await new Client(app.baseUrl).get("/locations/place-alpha");
    assert.equal(res.status, 200);
    assert.match(res.text, /<h1>Alpha Park<\/h1>/);
    assert.doesNotMatch(res.text, /class="card info"/);
  });

  test("a failing Places API gives a 500 with no details", async () => {
    app.api.on(DETAILS_PATH, (req, res) => res.writeHead(500).end());
    const res = await new Client(app.baseUrl).get("/locations/place-alpha");
    assert.equal(res.status, 500);
    assert.equal(res.text, "Internal Server Error");
  });

  test("a signed-in user sees whether they have visited the place", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("ivy");
    assert.match((await client.get("/locations/place-alpha")).text, /stamp NOT VISITED/);
    assert.equal((await client.markVisited()).text, "ok");
    assert.match((await client.get("/locations/place-alpha")).text, /stamp VISITED/);
  });

  test.todo(
    "place website link: a javascript: website from the Places API is not rendered as a link (open PR #1)",
  );
  test.todo(
    "server-side Google API key: the place page does not put GOOGLE_API_KEY into the HTML (photo URL)",
  );
});

describe("search", () => {
  let app;
  before(async () => (app = await start()));
  beforeEach(() => app.api.reset());
  after(() => app.stop());

  test("the search page lists the popular places", async () => {
    const res = await new Client(app.baseUrl).get("/search");
    assert.equal(res.status, 200);
    assert.match(res.text, /Celebrate SG50!/);
    assert.equal(page(res.text).placeLinks.length, 7);
    assert.equal(app.api.requests.length, 0);
  });

  test("a search lists the matching places", async () => {
    const client = new Client(app.baseUrl);
    await client.get("/search");
    const res = await client.post("/search", { search: "Beta" });
    assert.equal(res.status, 200);
    assert.deepEqual(page(res.text).placeLinks, ["place-beta"]);
    assert.match(res.text, /<p>Beta Museum<\/p>/);

    const [call] = app.api.calls(NEARBY);
    assert.equal(call.query.get("name"), "Beta");
    assert.equal(call.query.get("key"), GOOGLE_API_KEY);
    assert.equal(call.query.get("location"), "1.19,103.805");
    assert.equal(call.query.get("radius"), "25000");
  });

  test("an empty search goes back to the search page", async () => {
    const client = new Client(app.baseUrl);
    await client.get("/search");
    const res = await client.post("/search", { search: "" });
    assert.equal(res.status, 302);
    assert.equal(res.location, "/search");
    assert.equal(app.api.requests.length, 0);
  });

  test("a failing Places API gives a 400", async () => {
    app.api.on(NEARBY, (req, res) => res.writeHead(500).end());
    const client = new Client(app.baseUrl);
    await client.get("/search");
    assert.equal((await client.post("/search", { search: "Beta" })).status, 400);
  });

  test.todo(
    'search query encoding: a search for "Alpha Park" sends name=Alpha Park to Places, not Alpha+Park double-encoded (open PR #1)',
  );
  test.todo(
    "3.5 forms, bodyless and multipart CSRF correct: the search form works, including a second search from the results page (open PR #1)",
  );
});

describe("nearby places and carparks", () => {
  let app;
  let client;
  before(async () => {
    app = await start();
    client = new Client(app.baseUrl);
    await client.get("/");
  });
  beforeEach(() => app.api.reset());
  after(() => app.stop());

  test("POST /locations/nearby returns the Places results for the position", async () => {
    const res = await client.post("/locations/nearby", { lat: "1.3", long: "103.8" });
    assert.equal(res.status, 200);
    assert.deepEqual(
      JSON.parse(res.text).results.map((r) => r.place_id),
      ["place-alpha", "place-beta"],
    );
    const [call] = app.api.calls(NEARBY);
    assert.equal(call.query.get("location"), "1.3,103.8");
    assert.equal(call.query.get("radius"), "1500");
  });

  test("POST /locations/nearbyCarparks returns carparks sorted by distance", async () => {
    const res = await client.post("/locations/nearbyCarparks", { lat: "1.3", long: "103.8" });
    assert.equal(res.status, 200);
    const carparks = JSON.parse(res.text).d;
    assert.deepEqual(
      carparks.map((c) => c.Development),
      ["Near Carpark", "Far Carpark"],
    );
    assert.ok(carparks[0].Distance > 0 && carparks[0].Distance < carparks[1].Distance);
    assert.equal(carparks[0].Distance % 10, 0);
    const [call] = app.api.calls(CARPARKS_PATH);
    assert.equal(call.headers.accountkey, LTA_ACCOUNT_KEY);
  });

  for (const route of ["/locations/nearby", "/locations/nearbyCarparks"]) {
    test(`${route} refuses non-numeric coordinates with 400`, async () => {
      for (const [lat, long] of [
        ["abc", "103.8"],
        ["1.3", ""],
      ]) {
        const res = await client.post(route, { lat, long });
        assert.equal(res.status, 400, `${lat},${long}`);
        assert.equal(res.text, "Invalid coordinates.");
      }
      assert.equal(app.api.requests.length, 0);
    });
  }

  test("a failing upstream API gives a 400", async () => {
    app.api.on(CARPARKS_PATH, (req, res) => res.writeHead(500).end());
    const res = await client.post("/locations/nearbyCarparks", { lat: "1.3", long: "103.8" });
    assert.equal(res.status, 400);
  });

  test.todo(
    "coordinate bounds: Infinity, 1e999 and out-of-range coordinates are refused with 400 before calling Places (open PR #1)",
  );
  test.todo(
    "home page script: public/js/main.js sends the longitude and a callback in the nearby request, so the nearby list renders (open PR #1)",
  );
  test.todo(
    "3.9 client-side HTML escaping: public/js/main.js escapes quotes in the values it inserts with innerHTML",
  );
});

describe("marking a visit", () => {
  let app;
  before(async () => (app = await start()));
  beforeEach(() => app.api.reset());
  after(() => app.stop());

  test("a signed-out visitor is sent home", async () => {
    const client = new Client(app.baseUrl);
    await client.get("/");
    const res = await client.markVisited();
    assert.equal(res.status, 302);
    assert.equal(res.location, "/");
    assert.equal(app.api.requests.length, 0);
  });

  test("a visit records every place within 50 m, once", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("jack");
    assert.equal((await client.markVisited(1.3001, 103.8001)).text, "ok");
    const [call] = app.api.calls(NEARBY);
    assert.equal(call.query.get("location"), "1.3001,103.8001");
    assert.equal(call.query.get("radius"), "50");

    assert.equal((await client.markVisited()).text, "ok");
    const id = page((await client.get("/")).text).userId;
    assert.match((await client.get("/users/" + id)).text, /Visited 2 places/);
  });

  test("invalid coordinates are refused with 400", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("kate");
    const res = await client.markVisited("north", "east");
    assert.equal(res.status, 400);
    assert.equal(app.api.requests.length, 0);
  });
});
