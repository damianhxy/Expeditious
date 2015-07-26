var express = require("express");
var passport = require("passport");
var router = express.Router();
var auth = require("../middlewares/auth.js");
var user = require("../models/user.js");
var settings = require("../controllers/settings.js");
var moment = require("moment");

router.get("/leaderboard", function(req, res, next) {
    user.generateLeaderboard()
    .then(function(response) {
        res.render("leaderboards", {
            title: "LEADERBOARD",
            leaderboard: response
        });
    })
    .fail(function(err) {
        console.error(err);
        next(err);
    });
});

router.get("/login", function(req, res, next) {
    res.render("login", {
        title: "LOGIN"
    });
});

router.get("/signup", function(req, res, next) {
    res.render("signup", {
        title: "SIGNUP"
    });
});

router.get("/logout", auth, function(req, res, next) {
    req.session.success = "Successfully signed out.";
    req.logout();
    res.redirect("/");
});

router.post("/login", function(req, res, next) {
    passport.authenticate("local-signin", function(err, user, info) {
        if (err) return next(err);
        if (!user)
            return res.status(400).redirect("/users/login");
        return req.login(user, function(err) {
            if (err) return next(err);
            res.redirect("/");
        });
    })(req, res, next);
});

router.post("/signup", function(req, res, next) {
    passport.authenticate("local-signup", function(err, user, info) {
        if (err) return next(err);
		if (!user)
			return res.status(400).redirect("/users/signup");
        req.login(user, function(err) {
            if (err) return next(err);
            res.redirect("/");
        });
    })(req, res, next);
});

router.get("/:id", function(req, res, next) {
	user.get(req.params.id)
	.then(function(user) {
		var now = Date.now();
		user.joined = moment(user.joined).format(settings.MOMENTJS_JOINED_FORMAT);
		user.visited.filter(function(e) {
			return now - e.time <= 86400000;
		});
		user.visited.forEach(function(e) {
			e = moment(e).format(settings.MOMENTJS_ACTIVITY_FORMAT);
		});
		user.visited.sort(function(a, b) { // Greater comes first
			return b.time - a.time;
		});
		var isFollowing = false;
		for (var followee in req.user.following)
			if (req.user.following[followee] === user._id)
		res.render("profile", {
			title: "PROFILE",
			user: req.user,
			profile: user
		});
	})
	.fail(function(err) {
		console.error(err);
		next(err);
	});
});

module.exports = router;