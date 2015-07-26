var express = require("express");
var router = express.Router();
//var notification = require("../middlewares/notification.js");
var location = require("../models/location.js");
var settings = require("./settings.js");
var moment = require("moment");
//router.use(notification);
var user = require("../models/user.js");
var Q = require("q");

/* Routes */
router.use("/users", require("./users.js"));

router.use("/locations", require("./locations.js"));

router.get("/search", function(req, res, next) {
    res.render("search", {
        title: "SEARCH",
        user: req.user,
        hot: [{
            place_id: "ChIJvWDbfRwa2jERgNnTOpAU3-o",
            types: ["park"],
            description: "Singapore Botanic Gardens"
        }, {
            place_id: "ChIJnXwAOKAZ2jERAs-MHs1aDgI",
            types: ["shopping_mall"],
            description: "Clarke Quay"
        }, {
            place_id: "ChIJx4wPggYZ2jERnT8vOV1XU5k",
            types: ["shopping_mall"],
            description: "The Shoppes at Marina Bay Sands"
        }, {
            place_id: "ChIJMxZ-kwQZ2jERdsqftXeWCWI",
            types: ["park"],
            description: "Gardens by the Bay"
        }, {
            place_id: "ChIJKaGsJKUZ2jERxa8yhKrdPfI",
            types: ["library"],
            description: "National Library"
        }, {
            place_id: "ChIJQ6MVplUZ2jERn1LmNH0DlDA",
            types: ["amusement_park"],
            description: "Universal Studios Singapore"
        }, {
            place_id: "ChIJO9cemPUQ2jERvlh8KtwhtAc",
            types: ["park"],
            description: "Bukit Timah Nature Reserve"
        }]
    });
});

router.post("/search", function(req, res, next) {
	location.search(req.body.search)
	.then(function(response) {
		res.render("search", {
			title: "SEARCH",
			user: req.user,
			response: response
		});
	})
	.fail(function(err) {
		console.error(err);
		res.status(400).end();
	});
});

router.get("/", function(req, res, next) {
    if (req.user) {
        var activities = [];
		var now = Date.now();
        user.all()
		.then(function(users) {
			for (var user in users) {
				users[user].visited.filter(function(e) {
					return now - users[user].visited.time <= 86400000;
				});
				for (var activity in users[user].visited)
					activities.push(users[user].visited[activity]);
			}
			activities.sort(function(a, b) {
				return b.time - a.time;
			});
			activities.map(function(e) {
				e.time = moment(e.time).format(settings.MOMENTJS_ACTIVITIY_FORMAT);
			});
			res.render("home", {
                title: "EXPEDITIO",
                user: req.user,
                activities: activities
            });
		})
		.fail(function(err) {
			console.error(err);
			next(err);
		});
    } else
		res.render("home", {
			title: "EXPEDITIO",
			user: req.user
		});	
});

/* 404 & 500 */
router.use(function(req, res, next) {
    res.status(404).send("Not Found.");
});

router.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send("Internal Error: " + err.stack);
});

module.exports = router;