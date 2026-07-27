const axios = require("axios");
const settings = require("../controllers/settings.js");

const placesTypes = (exports.types = [
  "airport",
  "amusement_park",
  "aquarium",
  "art_gallery",
  "casino",
  "church",
  "hindu_temple",
  "hospital",
  "library",
  "mosque",
  "museum",
  "park",
  "place_of_worship",
  "school",
  "shopping_mall",
  "stadium",
  "subway_station",
  "synagogue",
  "university",
  "zoo",
]);

exports.busCost = async function (startLat, startLong, endLat, endLong) {
  const { data } = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
    params: {
      origin: startLat + "," + startLong,
      destination: endLat + "," + endLong,
      mode: "transit",
      key: settings.API_KEY,
    },
  });
  let totalCost = 0;
  data.routes.forEach((e) => {
    if (e.fare) totalCost += e.fare.value;
  });
  return totalCost;
};

const nearby = (exports.findNearby = async function (lat, long, radius) {
  const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    params: {
      key: settings.API_KEY,
      location: lat + "," + long,
      radius,
      types: placesTypes.join("|"),
    },
  });
  return data;
});

exports.findNearbyCarparks = async function (_lat, _long, _radius) {
  const { data } = await axios.get(
    "https://datamall.mytransport.sg/ltaodataservice.svc/CarParkSet",
    {
      headers: {
        AccountKey: settings.ACCOUNT_KEY,
        UniqueUSERID: settings.UniqueUserID,
        accept: "application/json",
      },
    },
  );
  return data;
};

exports.getPlace = async function (id) {
  const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
    params: { key: settings.API_KEY, placeid: id },
  });
  return data;
};

exports.markVisited = async function (lat, long, userid) {
  const users = require("./user.js");
  const res = await nearby(lat, long, 50);
  const now = Date.now();
  res.results.forEach((result) => {
    users.addVisited(userid, result.place_id, now);
  });
};

exports.getInfo = async function (title) {
  const cleanTitle = title ? title.replace(/Mall/g, "").trim() : "";
  const { data } = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      format: "json",
      action: "query",
      prop: "extracts",
      exintro: "",
      explaintext: "",
      titles: cleanTitle,
    },
  });
  return data;
};

exports.search = async function (str) {
  if (!str || typeof str !== "string") throw new Error("Invalid search query.");
  const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    params: {
      key: settings.API_KEY,
      location: "1.19,103.805",
      radius: 25000,
      types: placesTypes.join("|"),
      name: str.replace(/ /g, "+"),
    },
  });
  return data;
};
