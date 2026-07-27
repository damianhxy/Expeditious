const passport = require("passport");
const localStrategy = require("passport-local");
const session = require("express-session");
const exphbs = require("express-handlebars");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const SQLiteStore = require("better-sqlite3-session-store")(session);
const { csrfSync } = require("csrf-sync");
const csrf = csrfSync();
const settings = require("./settings.js");
const userModel = require("../models/user.js");
const location = require("../models/location.js");
const notification = require("../middlewares/notification.js");
const db = require("../database");

function formatDate(date) {
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const d = new Date(date);
  const day = d.getDate();
  const suffix =
    ["th", "st", "nd", "rd"][day % 100 > 10 && day % 100 < 14 ? 0 : Math.min(day % 10, 3)] || "th";
  const hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return (
    day +
    suffix +
    " " +
    months[d.getMonth()] +
    " " +
    pad(h12) +
    ":" +
    pad(d.getMinutes()) +
    " " +
    ampm
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = function (app, express, _authLimiter) {
  const hbs = exphbs.create({
    defaultLayout: "default",
    helpers: {
      visited(visitedArr, placeId) {
        if (!visitedArr || !Array.isArray(visitedArr)) return "NOT VISITED";
        for (let i = 0; i < visitedArr.length; i++) {
          if (visitedArr[i].id === placeId) return "VISITED";
        }
        return "NOT VISITED";
      },
      length(arr) {
        return arr ? arr.length : 0;
      },
      types(arr) {
        if (!arr || !arr.length) return "map-marker";
        let a = 0;
        let l = "map-marker";
        for (; a < arr.length && location.types.indexOf(arr[a]) === -1; a++);
        if (a >= arr.length) return l;
        switch (arr[a]) {
          case "airport":
            l = "plane";
            break;
          case "amusement_park":
            l = "space-shuttle";
            break;
          case "aquarium":
            l = "anchor";
            break;
          case "art_gallery":
            l = "paint-brush";
            break;
          case "casino":
            l = "money";
            break;
          case "hospital":
            l = "ambulance";
            break;
          case "library":
            l = "book";
            break;
          case "museum":
            l = "institution";
            break;
          case "park":
            l = "tree";
            break;
          case "shopping_mall":
            l = "building";
            break;
          case "stadium":
            l = "soccer-ball-o";
            break;
          case "school":
          case "university":
            l = "graduation-cap";
            break;
          case "zoo":
            l = "paw";
            break;
          case "mosque":
            l = "moon-o";
            break;
          case "church":
          case "hindu_temple":
          case "synagogue":
          case "place_of_worship":
            l = "group";
            break;
          case "subway_station":
            l = "train";
            break;
        }
        return l;
      },
      typename(arr) {
        if (!arr || !arr.length) return "Unknown";
        let a = 0;
        for (; a < arr.length && location.types.indexOf(arr[a]) === -1; a++);
        if (a >= arr.length) return "Unknown";
        let d = arr[a].replace(/_/g, " ");
        d = d.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
        return d;
      },
      list(arr) {
        return arr ? arr.join(",") : "";
      },
      photos(arr) {
        if (arr && arr.length > 0) return arr[Math.min(2, arr.length - 1)].photo_reference;
        return "";
      },
      formatDate(date) {
        return formatDate(date);
      },
      escapeHtml(str) {
        return escapeHtml(str);
      },
    },
  });

  app.use(express.static("public"));

  require("console-stamp")(console, settings.TIME_FORMAT);
  morgan.token("time", () => formatDate(new Date()));
  app.use(
    morgan("[:time] :method :url :status :res[content-length] - :remote-addr - :response-time ms"),
  );

  app.use(cookieParser(settings.SECRET));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  const isProduction = app.get("env") === "production";

  app.use(
    session({
      secret: settings.SECRET,
      saveUninitialized: false,
      resave: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      },
      store: new SQLiteStore({
        client: db,
        expired: { clear: true, intervalMs: 900000 },
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(notification);

  app.use(csrf.csrfSynchronisedProtection);
  app.use((req, res, next) => {
    if (req.method === "GET") {
      res.locals.csrfToken = csrf.generateToken(req);
    }
    next();
  });

  passport.use(
    "local-signin",
    new localStrategy({ passReqToCallback: true }, async (req, username, password, done) => {
      try {
        const user = await userModel.authenticate(username, password);
        console.info("Signed in " + user.username);
        done(null, user);
      } catch (err) {
        console.error(err.stack || err.message);
        req.session.error = err.message;
        done(null, false);
      }
    }),
  );

  passport.use(
    "local-signup",
    new localStrategy({ passReqToCallback: true }, async (req, username, password, done) => {
      try {
        const user = await userModel.create(req.body.name, username, password, req.body.password2);
        console.info("Signed up " + user.username);
        done(null, user);
      } catch (err) {
        console.error(err.stack || err.message);
        req.session.error = err.message;
        done(null, false);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userModel.get(id);
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  });

  app.enable("case sensitive routing");
  app.enable("strict routing");
  app.disable("x-powered-by");
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");
};
