const express = require("express");
const router = express.Router();
const location = require("../models/location.js");
const settings = require("./settings.js");
const auth = require("../middlewares/auth.js");

function rad(x) {
  return (x * Math.PI) / 180;
}

function distance(lat1, long1, lat2, long2) {
  const R = 6384469;
  const dLat = rad(lat2 - lat1);
  const dLong = rad(long2 - long1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.ceil((R * c) / 10) * 10;
}

function isCoords(v) {
  return v !== "" && v !== null && v !== undefined && !isNaN(Number(v));
}

router.get("/:id", async (req, res, next) => {
  try {
    const response = await location.getPlace(req.params.id);
    const placeData = response.result;
    let desc = "";
    let openingHours = [];
    if (placeData.opening_hours && Array.isArray(placeData.opening_hours.weekday_text)) {
      openingHours = placeData.opening_hours.weekday_text;
    }
    try {
      const info = await location.getInfo(placeData.name);
      const pages = info.query.pages;
      const keys = Object.keys(pages);
      if (keys.length > 0 && pages[keys[0]] && pages[keys[0]].extract) {
        const sentences = pages[keys[0]].extract.split(". ");
        desc = sentences[0] + ". " + (sentences[1] || "") + ".";
      }
    } catch (_) {
      // Wikipedia info is optional
    }
    res.render("place", {
      user: req.user,
      location: placeData,
      openingHours,
      key: settings.API_KEY,
      desc,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/mark", auth, async (req, res) => {
  if (!isCoords(req.body.lat) || !isCoords(req.body.long)) {
    return res.status(400).send("Invalid coordinates.");
  }
  try {
    await location.markVisited(Number(req.body.lat), Number(req.body.long), req.user.id);
    res.send("ok");
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
});

router.post("/nearby", async (req, res) => {
  if (!isCoords(req.body.lat) || !isCoords(req.body.long)) {
    return res.status(400).send("Invalid coordinates.");
  }
  try {
    const response = await location.findNearby(Number(req.body.lat), Number(req.body.long), 1500);
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
});

router.post("/nearbyCarparks", async (req, res) => {
  if (!isCoords(req.body.lat) || !isCoords(req.body.long)) {
    return res.status(400).send("Invalid coordinates.");
  }
  try {
    const response = await location.findNearbyCarparks(Number(req.body.lat), Number(req.body.long), 1000);
    response.d.forEach((e) => {
      e.Distance = distance(Number(req.body.lat), Number(req.body.long), e.Latitude, e.Longitude);
    });
    response.d.sort((a, b) => a.Distance - b.Distance);
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
});

module.exports = router;
