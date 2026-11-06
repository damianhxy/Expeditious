// Preloaded into the app by test/helpers/app.js (node -r). Sends every axios request to the
// fake API server the test started (STUB_API_URL) instead of Google Places, LTA DataMall or
// Wikipedia, so the tests need no network and no API keys. The request still goes through
// axios' real HTTP adapter; only the URL changes. Any other host is refused.
const axios = require(require.resolve("axios", { paths: [process.cwd()] }));

const STUB = process.env.STUB_API_URL;
const HOSTS = new Set(["maps.googleapis.com", "datamall.mytransport.sg", "en.wikipedia.org"]);

axios.interceptors.request.use(function (config) {
  const url = new URL(config.url);
  if (!STUB || !HOSTS.has(url.host)) {
    throw Error("test stub: refusing a request to " + url.host);
  }
  config.url = STUB + "/" + url.host + url.pathname + url.search;
  config.proxy = false;
  return config;
});
