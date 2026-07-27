exports.PORT = process.env.PORT || 8080;
exports.SECRET = process.env.SESSION_SECRET;
if (!exports.SECRET) {
  console.error(
    "FATAL: SESSION_SECRET environment variable is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
  process.exit(1);
}
exports.TIME_FORMAT = "dd mmm HH:MM:ss";
exports.MOMENTJS_JOINED_FORMAT = "Do MMMM YYYY";
exports.MOMENTJS_ACTIVITY_FORMAT = "Do MMM h:mm A";
exports.ACCOUNT_KEY = process.env.LTA_ACCOUNT_KEY || "";
exports.UniqueUserID = process.env.LTA_USER_ID || "";
exports.API_KEY = process.env.GOOGLE_API_KEY || "";
