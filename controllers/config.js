var bodyParser = require("body-parser");
var user = require("../models/user.js");
var morgan = require("morgan");
var passport = require("passport");
var cookieParser = require("cookie-parser");
var settings = require("./settings.js");
var session = require("express-session");
var exphbs = require("express-handlebars");
var localStrategy = require("passport-local");
var location = require("../models/location.js");
var notifications = require("../middlewares/notification.js");

module.exports = function(app, express) {
    app.use(notifications);
    var hbs = exphbs.create({
        defaultLayout: "default",
        helpers: {
            visited: function(arr1, check) {
				return ~arr1.indexOf(check) ? "VISITED" : "NOT VISITED" ;
			},
			length: function(arr) {
				return arr.length;
			},
			types: function(arr) {
				var a = 0, d;
				for(; a < arr.length && ! ~ location.types.indexOf(arr[a]); a++);
				switch(arr[a]) {
					case "airport":
						d = "plane";
						break;
					case "amusement_park":
						d = "space-shuttle";
						break;
					case "aquarium":
						d = "anchor";
						break;
					case "art_gallery":
						d = "paint-brush";
						break;
					case "casino":
						d = "money";
						break;
					case "hospital":
						d = "ambulance";
						break;
					case "library":
						d = "book";
						break;
					case "museum":
						d = "institution";
						break;
					case "park":
						d = "tree";
						break;
					case "shopping_mall":
						d = "building";
						break;
					case "stadium":
						d = "soccer-ball-o";
						break;
					case "school":
					case "university":
						d = "graduation-cap";
						break;
					case "zoo":
						d = "paw";
						break;
					case "mosque":
						d = "moon-o";
						break;
					case "church":
					case "hindu_temple":
					case "synagogue":
						d = "group";
						break;
				}
				return d;
			},
			typename: function(arr) {
				var a = 0, d;
				for(; a < arr.length && ! ~ location.types.indexOf(arr[a]); a++);
				d = arr[a];
				d = d.replace("_"," ");
				//titlecase
				d = d.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
				return d;
			},
			list: function(arr) {
				return arr.join(',');
			}
        }
    });

    app.use(express.static("public"));

    require("console-stamp")(console, settings.TIME_FORMAT);
    morgan.token("time", function(req, res) {
        return require("console-stamp/node_modules/dateformat")(new Date(), settings.TIME_FORMAT);
    });
    app.use(morgan("[:time] :method :url :status :res[content-length] - :remote-addr - :response-time ms"));

    // Middleware
    app.use(cookieParser(settings.SECRET));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(session({
        secret: settings.SECRET,
        saveUninitialized: true,
        resave: true
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    // Strategies
    passport.use("local-signin", new localStrategy(
        { passReqToCallback: true },
        function(req, username, password, done) {
            return user.authenticate(username, password)
            .then(function(user) {
                console.info("Signed in " + user.username);
                req.session.success = "Welcome back, " + user.username + ".";
                done(null, user);
            })
            .fail(function(err) {
                console.error(err.stack);
                req.session.error = err.message;
                done(null, false);
            });
        }
    ));

    passport.use("local-signup", new localStrategy(
        { passReqToCallback: true },
        function(req, username, password, done) {
            return user.create(req.body.name, username, password, req.body.password2)
            .then(function(user) {
                console.info("Signed up " + user.username);
                req.session.success = "Welcome, " + user.username + ".";
                done(null, user);
            })
            .fail(function(err) {
                console.error(err.stack);
                req.session.error = err.message;
                done(null, false);
            });
        }
    ));

    // Serialization
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        user.get(id)
        .then(function(user) {
            done(null, user);
        })
        .fail(function(err) {
            done(err, false);
        });
    });

    // Settings
    app.enable("case sensitive routing");
    app.enable("strict routing");
    app.disable("x-powered-by");
    app.engine("handlebars", hbs.engine);
    app.set("view engine", "handlebars");
};