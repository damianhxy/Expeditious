const express = require("express");
const router = express.Router();
const dayjs = require("dayjs");
const advancedFormat = require("dayjs/plugin/advancedFormat");
const userModel = require("../models/user.js");
const location = require("../models/location.js");
const settings = require("./settings.js");

dayjs.extend(advancedFormat);

/* Routes */
router.use("/users", require("./users.js"));
router.use("/locations", require("./locations.js"));

router.get("/search", (req, res) => {
  res.render("search", {
    title: "SEARCH",
    user: req.user,
    hot: [
      {
        place_id: "ChIJvWDbfRwa2jERgNnTOpAU3-o",
        types: ["park"],
        description: "Singapore Botanic Gardens",
      },
      {
        place_id: "ChIJnXwAOKAZ2jERAs-MHs1aDgI",
        types: ["shopping_mall"],
        description: "Clarke Quay",
      },
      {
        place_id: "ChIJx4wPggYZ2jERnT8vOV1XU5k",
        types: ["shopping_mall"],
        description: "The Shoppes at Marina Bay Sands",
      },
      {
        place_id: "ChIJMxZ-kwQZ2jERdsqftXeWCWI",
        types: ["park"],
        description: "Gardens by the Bay",
      },
      {
        place_id: "ChIJKaGsJKUZ2jERxa8yhKrdPfI",
        types: ["library"],
        description: "National Library",
      },
      {
        place_id: "ChIJQ6MVplUZ2jERn1LmNH0DlDA",
        types: ["amusement_park"],
        description: "Universal Studios Singapore",
      },
      {
        place_id: "ChIJO9cemPUQ2jERvlh8KtwhtAc",
        types: ["park"],
        description: "Bukit Timah Nature Reserve",
      },
    ],
  });
});

router.post("/search", async (req, res) => {
  const search = req.body.search;
  if (!search || typeof search !== "string") {
    return res.status(400).redirect("/search");
  }
  try {
    const response = await location.search(search);
    res.render("search", { title: "SEARCH", user: req.user, response });
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
});

router.get("/", async (req, res, next) => {
  if (req.user) {
    try {
      const activities = [];
      const now = Date.now();
      const userList = await userModel.all();
      userList.forEach((u) => {
        const recent = u.visited.filter((e) => now - e.time <= 86400000);
        recent.forEach((e) => {
          activities.push({
            locationId: e.id,
            username: u.username,
            time: e.time,
            timeFormatted: dayjs(e.time).format(settings.MOMENTJS_ACTIVITY_FORMAT),
          });
        });
      });
      activities.sort((a, b) => b.time - a.time);
      res.render("home", { title: "EXPEDITIO", user: req.user, activities });
    } catch (err) {
      console.error(err);
      next(err);
    }
  } else {
    res.render("home", { title: "EXPEDITIO", user: req.user });
  }
});

/* 404 & 500 */
router.use((req, res) => {
  res.status(404).send("Not Found.");
});

router.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

module.exports = router;
