const express = require("express");
const passport = require("passport");
const router = express.Router();
const dayjs = require("dayjs");
const advancedFormat = require("dayjs/plugin/advancedFormat");
const { body, validationResult } = require("express-validator");
const auth = require("../middlewares/auth.js");
const userModel = require("../models/user.js");
const settings = require("../controllers/settings.js");

dayjs.extend(advancedFormat);

const signupValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 50 }),
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .isAlphanumeric()
    .withMessage("Username must be alphanumeric"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("password2").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),
];

router.get("/leaderboards", async (req, res, next) => {
  try {
    const response = await userModel.generateLeaderboard();
    res.render("leaderboards", { title: "LEADERBOARD", leaderboard: response });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/login", (req, res) => {
  res.render("login", { title: "LOGIN" });
});

router.get("/signup", (req, res) => {
  res.render("signup", { title: "SIGNUP" });
});

router.get("/logout", auth, (req, res) => {
  req.session.success = "Successfully signed out.";
  req.logout(() => {
    res.redirect("/");
  });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local-signin", (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(400).redirect("/users/login");
    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

router.post("/signup", signupValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors
      .array()
      .map((e) => e.msg)
      .join(". ");
    return res.status(400).redirect("/users/signup");
  }
  passport.authenticate("local-signup", (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(400).redirect("/users/signup");
    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

router.get("/:id", async (req, res, next) => {
  try {
    const usr = await userModel.get(req.params.id);
    if (!usr) return res.status(404).send("User not found.");
    const now = Date.now();
    usr.joined = dayjs(usr.joined).format(settings.MOMENTJS_JOINED_FORMAT);
    usr.visited = usr.visited.filter((e) => now - e.time <= 86400000);
    usr.visited.forEach((e) => {
      e.timeFormatted = dayjs(e.time).format(settings.MOMENTJS_ACTIVITY_FORMAT);
    });
    usr.visited.sort((a, b) => b.time - a.time);
    res.render("profile", { title: "PROFILE", user: req.user, profile: usr });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
