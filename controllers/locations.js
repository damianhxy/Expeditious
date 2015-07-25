var express = require("express");
var passport = require("passport");
var router = express.Router();
var location = require("../models/location.js");

router.get("/:id", function(req, res, next) {
    location.getPlace(req.params.id)
    .then(function(response) {
        res.render("place", {
			user: req.user,
            location: response.result
        });
    })
    .fail(function(err) {
        console.error(err);
        next(err);
    });
});

router.post("/mark", function(req, res, next) {
	location.markVisited(req.body.lat, req.body.long, req.user._id)
	.then(function(num) {
		res.send(num);
	})
	.fail(function(err) {
		console.error(err);
		res.status(400).end();
	});
});

router.post("/nearby", function(req, res, next) {
    location.findNearby(req.body.lat, req.body.long, /*req.user.preferences.radius*/ 1500)
    .then(function(response) {
        res.send(response);
    })
    .fail(function(err) {
        console.error(err);
        res.status(400).end();
    });
});

router.post("/nearbyCarparks", function(req, res, next) {
	location.findNearbyCarparks(req.body.lat, req.body.long, /*req.user.preferences.radius*/ 1000)
	.then(function(response) {
		res.send(response);
	})
	.fail(function(err) {
		console.error(err);
		res.status(400).end();
	});
});

module.exports = router;