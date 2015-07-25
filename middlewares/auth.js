module.exports = function(req, res, next) {
    if (req.isAuthenticated())
        return next();
    req.session.error = "Unauthorised.";
    res.status(401).redirect("/");
};