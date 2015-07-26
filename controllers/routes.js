var express = require("express");
var router = express.Router();
//var notification = require("../middlewares/notification.js");
var location = require("../models/location.js");
//router.use(notification);
var user = require("../models/user.js");

/* Routes */
router.use("/users", require("./users.js"));

router.use("/locations", require("./locations.js"));

router.get("/search", function(req, res, next) {
    res.render("search", {
        title: "SEARCH",
        user: req.user,
        hot: [{
            place_id: "ChIJ0QX_Brki2jER-pZKNdqk_a8",
            types: ["park"],
            description: "East Coast Park"
        }, {
            place_id: "ChIJMcwh6o0Z2jERNxsLqnSIvlw",
            types: ["shopping_mall"],
            description: "ION Orchard"
        }, {
            place_id: "ChIJHUH7GiY92jER6cr6vHkVWiA",
            types: ["school"],
            description: "ITE College East"
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
        var following = [], activities = [];
        for (var followee in req.user.following) {
            following.push(user.get(req.user.following[followee]));
        }
        Q.all(following)
        .then(function(followers) {
            var now = Date.now();
            for (var follower in followers) {
                followers[follower].visited.filter(function(e) {
                    return now - e.time <= 86400000;
                });
                for (var visit in followers[follower].visited) {
                    activities.push(followers[follower].visited[visit]);
                }
            }
            activities.sort(function(a, b) { // Latest comes first
                return b.time - a.time;
            });
            res.render("home", {
                title: "EXPEDITIO",
                user: req.user,
                activities: activities
            });
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