var express = require("express");
var passport = require("passport");
var router = express.Router();
var location = require("../models/location.js");

router.get("/carpark/:id", function(req, res, next) {

});

router.get("/:id", function(req, res, next) {
    location.getPlace(req.params.id)
    .then(function(response) {
        res.render("place", {
            response: response
        });
    })
    .fail(function(err) {
        console.error(err);
        next(err);
    });
});

router.post("/nearby", function(req, res, next) {
    location.findNearby(req.params.lat, req.params.long, req.user.preferences.radius)
    .then(function(response) {
        res.send(response);
    })
    .fail(function(err) {
        console.error(err);
        next(err);
    });
});

router.post("/nearbyCarparks", function(req, res, next) {

});

module.exports = router;