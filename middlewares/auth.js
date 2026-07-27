module.exports = function (req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.error = "Unauthorized.";
  res.status(401).redirect("/");
};
