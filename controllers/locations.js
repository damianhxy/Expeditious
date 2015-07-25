var express = require("express");
var passport = require("passport");
var router = express.Router();
var location = require("../models/location.js");

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

module.exports = router;