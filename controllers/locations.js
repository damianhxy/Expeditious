var express = require("express");
var passport = require("passport");
var router = express.Router();
var location = require("../models/location.js");

function rad(x){
    return x*Math.PI/180;
}

function distance(lat1, long1, lat2, long2){
    var R = 6384469;
    var dLat = rad(lat2-lat1);
    var dLong = rad(long2-long1);
    var a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLong/2)*Math.sin(dLong/2);
    var c  = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return Math.ceil(d/10)*10;
}

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
        response.d.map(function(e) {
            e.Distance = distance(req.body.lat, req.body.long, e.Latitude, e.Longitude);
        });
        response.d.sort(function(a, b) {
            return a.Distance - b.Distance;
        });
		res.send(response);
	})
	.fail(function(err) {
		console.error(err);
		res.status(400).end();
	});
});

module.exports = router;