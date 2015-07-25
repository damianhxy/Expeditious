var express = require("express");
var router = express.Router();
var notification = require("../middlewares/notification.js");
router.use(notification);

/* Routes */
router.use("/users", require("./users.js"));

router.use("/location", require("./locations.js"));

router.get("/", function(req, res, next) {
    res.render("home", {
        title: "EXPEDITIO",
        user: req.user
    });
});

/* 404 & 500 */
router.use(function(req, res, next) {
    res.status(404).render("404", {
        title: "Page Not Found",
        user: req.user
    });
});

router.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).render("500", {
        title: "Internal Server Error",
        user: req.user
    });
});

module.exports = router;