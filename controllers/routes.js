var express = require("express");
var router = express.Router();
var notification = require("../middlewares/notification.js");
var location = require("../models/location.js");
router.use(notification);

/* Routes */
router.use("/users", require("./users.js"));

router.use("/location", require("./locations.js"));

router.get("/search", function(req, res, next) {
    res.render("search", {
        title: "SEARCH",
        user: req.user
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