var express = require("express");
var passport = require("passport");
var router = express.Router();

router.post("/signin", function(req, res, next) {
    passport.authenticate("local-signin", function(err, user, info) {
        if (err) return next(err);
        if (!user)
            return res.status(400).redirect(req.headers.referer || "/");
        return req.login(user, function(err) {
            if (err) return next(err);
            res.redirect(req.headers.referer || "/");
        });
    })(req, res, next);
});

router.post("/signup", function(req, res, next) {
    passport.authenticate("local-signup", function(err, user, info) {
        if (err) return next(err);
        req.login(user, function(err) {
            if (err) return next(err);
            res.redirect(req.headers.referer || "/");
        });
    })(req, res, next);
});

module.exports = router;