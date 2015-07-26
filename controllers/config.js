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

module.exports = function(app, express) {
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
				var a = 0, l;
				for(; a < arr.length && ! ~ location.types.indexOf(arr[a]); a++);
				switch(arr[a]) {
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
			},
			photos: function(arr){
				if(arr) return arr[Math.min(2,arr.length - 1)].photo_reference;
				else return 0;
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
                // req.session.success = "Welcome back, " + user.username + ".";
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
                // req.session.success = "Welcome, " + user.username + ".";
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