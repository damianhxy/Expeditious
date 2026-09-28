require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
const settings = require("./controllers/settings.js");

app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

require("./controllers/config.js")(app, express);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts, please try again later.",
});
app.use("/users/login", authLimiter);
app.use("/users/signup", authLimiter);

app.use(require("./controllers/routes.js"));

app.use((_req, res) => {
  res.status(404).send("Not Found.");
});

app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message);
  const isCsrfError = err.code === "EBADCSRFTOKEN";
  res
    .status(isCsrfError ? 403 : 500)
    .send(isCsrfError ? "Invalid CSRF token." : "Internal Server Error");
});

app.listen(settings.PORT);
console.info("Listening on port " + settings.PORT + " in " + app.get("env") + " mode.");
