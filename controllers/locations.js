var express = require("express");
var passport = require("passport");
var router = express.Router();
var location = require("../models/location.js");

router.get("/:id", function(req, res, next) {
    location.getPlace(req.params.id)
    .then(function(response) {
        res.render("place", {
			user: req.user,
            response: response
        });
    })
    .fail(function(err) {
        console.error(err);
        next(err);
    });
});

router.post("/mark", function(req, res, next) {
	location.markVisited(req.body.lat, req.body.long, req.user._id)
	.then(function() {
		res.end();
	})
	.fail(function(err) {
		console.error(err);
		res.status(400).end();
	})
});

router.post("/nearby", function(req, res, next) {
    location.findNearby(req.params.lat, req.params.long, req.user.preferences.radius)
    .then(function(response) {
        res.send(response);
    })
    .fail(function(err) {
        console.error(err);
        res.status(400).end();
    });
});

module.exports = router;