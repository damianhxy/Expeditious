var express = require("express");
var passport = require("passport");
var router = express.Router();
var auth = require("../middlewares/auth.js");
var user = require("../models/user.js");
var Q = require("q");

router.post("/activity", function(req, res, next) {
    var following = [], activities = [];
    for (var followee in req.user.following)
        following.push(user.get(req.user.following[followee]));
    Q.all(following)
    .then(function(followers) {
        var now = Date.now();
        for (var follower in followers) {
            followers[follower].visited.filter(function(e) {
                return now - e.time <= 86400000;
            });
            for (var visit in followers[follower].visited)
                activities.push(followers[follower].visited[visit]);
        }
        res.send(activities);
    })
    .fail(function(err) {
        console.error(err.stack);
        next(err);
    });
})

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

router.get("/leaderboard", function(req, res, next) {
    user.generateLeaderboard(req.user._id)
    .then(function(res) {
        res.render("leaderboard", {
            title: "LEADERBOARD",
            stats: res
        });
    })
    .fail(function(err) {
        console.error(err);
        next(err);
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
            return res.status(400).redirect("/");
        return req.login(user, function(err) {
            if (err) return next(err);
            res.redirect("/");
        });
    })(req, res, next);
});

router.post("/signup", function(req, res, next) {
    passport.authenticate("local-signup", function(err, user, info) {
        if (err) return next(err);
        req.login(user, function(err) {
            if (err) return next(err);
            res.redirect("/");
        });
    })(req, res, next);
});

module.exports = router;