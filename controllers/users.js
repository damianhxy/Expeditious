var express = require("express");
var passport = require("passport");
var router = express.Router();
var auth = require("../middlewares/auth.js");

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