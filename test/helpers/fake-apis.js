// A local stand-in for the Google Places, LTA DataMall and Wikipedia APIs, with synthetic
// fixtures. stub-apis.js points the app's axios requests here. Every request is recorded, and a
// test can replace the handler for a path with `api.on(path, handler)`.
const http = require("node:http");

exports.PLACES = [
  {
    place_id: "place-alpha",
    name: "Alpha Park",
    types: ["park", "point_of_interest"],
    geometry: { location: { lat: 1.3001, lng: 103.8001 } },
  },
  {
    place_id: "place-beta",
    name: "Beta Museum",
    types: ["museum"],
    geometry: { location: { lat: 1.3005, lng: 103.8005 } },
  },
];

exports.DETAILS = {
  "place-alpha": {
    place_id: "place-alpha",
    name: "Alpha Park",
    types: ["park", "point_of_interest"],
    formatted_address: "1 Alpha Road, Singapore 000001",
    opening_hours: { weekday_text: ["Monday: 7 AM - 7 PM", "Tuesday: Closed"] },
    rating: 4.5,
    website: "https://alpha.example/",
    photos: [{ photo_reference: "photo-ref-alpha" }],
    geometry: { location: { lat: 1.3001, lng: 103.8001 } },
  },
};

exports.CARPARKS = [
  { Development: "Far Carpark", Lots: 40, Latitude: 1.31, Longitude: 103.81 },
  { Development: "Near Carpark", Lots: 12, Latitude: 1.3002, Longitude: 103.8002 },
];

const WIKI_EXTRACT = "Alpha Park is a synthetic park. It exists only in tests. Nothing more.";

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const defaults = {
  "/maps.googleapis.com/maps/api/place/nearbysearch/json": (req, res, url) => {
    const name = url.searchParams.get("name");
    const results = name
      ? exports.PLACES.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()))
      : exports.PLACES;
    json(res, 200, { status: "OK", results });
  },
  "/maps.googleapis.com/maps/api/place/details/json": (req, res, url) => {
    const result = exports.DETAILS[url.searchParams.get("placeid")];
    json(res, 200, result ? { status: "OK", result } : { status: "INVALID_REQUEST" });
  },
  "/datamall.mytransport.sg/ltaodataservice.svc/CarParkSet": (req, res) => {
    json(res, 200, { d: exports.CARPARKS.map((c) => ({ ...c })) });
  },
  "/en.wikipedia.org/w/api.php": (req, res, url) => {
    const pages =
      url.searchParams.get("titles") === "Alpha Park" ? { 1: { extract: WIKI_EXTRACT } } : {};
    json(res, 200, { query: { pages } });
  },
};

exports.start = function () {
  const handlers = { ...defaults };
  const requests = [];
  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, "http://stub");
    requests.push({
      method: req.method,
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers,
    });
    const handler = handlers[url.pathname];
    if (handler) handler(req, res, url);
    else json(res, 404, { error: "no fixture for " + url.pathname });
  });
  return new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", function () {
      resolve({
        url: "http://127.0.0.1:" + server.address().port,
        requests,
        // Requests for one API path, oldest first.
        calls: (path) => requests.filter((r) => r.path === path),
        on: (path, handler) => (handlers[path] = handler),
        reset: () => {
          for (const path of Object.keys(handlers)) delete handlers[path];
          Object.assign(handlers, defaults);
          requests.length = 0;
        },
        stop: () => new Promise((done) => server.close(done)),
      });
    });
  });
};

exports.NEARBY = "/maps.googleapis.com/maps/api/place/nearbysearch/json";
exports.DETAILS_PATH = "/maps.googleapis.com/maps/api/place/details/json";
exports.CARPARKS_PATH = "/datamall.mytransport.sg/ltaodataservice.svc/CarParkSet";
exports.WIKI = "/en.wikipedia.org/w/api.php";
