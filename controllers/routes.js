var express = require("express");
var router = express.Router();
var notification = require("../middlewares/notification.js");
router.use(notification);

/* Routes */

module.exports = router;