var Q = require("q");
var nedb = require("nedb");
var request = require("request");
var settings = require("../controllers/settings.js");
var users = require("./user.js");

var placesTypes = exports.types = [
    "airport",
    "amusement_park",
    "aquarium",
    "art_gallery",
    "casino",
    "church",
	"hindu_temple",
    "hospital",
    "library",
    "mosque",
	"museum",
	"park",
	"school",
    "shopping_mall",
	"stadium",
    "synagogue",
    "university",
    "zoo"
];

exports.busCost = function(startLat, startLong, endLat, endLong) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "https://maps.googleapis.com";
        var path = "/maps/api/directions/json?";
        path += "origin=" + startLat + "," + startLong;
        path += "&destination=" + endLat + "," + endLong;
        path += "&mode=transit";
        request(host + path, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                var totalCost = 0;
                body = JSON.parse(body);
                body.routes.forEach(function(e) {
                    if (e.fare)
                        totalCost += e.fare.value;
                });
                resolve(totalCost)
            } else {
                reject(err);
            }
        });
    });
};

var nearby = exports.findNearby = function(lat, long, radius) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "https://maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + lat + "," + long;
        path += "&radius=" + radius;
        path += "&types=" + placesTypes.join("|");
        request(host + path, function(error, response, body) {
            if (!error && response.statusCode === 200)
                resolve(JSON.parse(body));
            else
                reject(error);
        });
    });
};

exports.findNearbyCarparks = function(lat, long, radius) {
	return Q.promise(function(resolve, reject, notify) {
		var host = "http://datamall.mytransport.sg";
		var path = "/ltaodataservice.svc/CarParkSet";
		var options = {
            url: host + path,
            headers: {
                "AccountKey": settings.ACCOUNT_KEY,
                "UniqueUSERID": settings.UniqueUserID,
                "accept": "application/json"
            }
        };
        function callback(error, response, body) {
            if (!error && response.statusCode === 200)
                resolve(JSON.parse(body));
            else
                reject(error);
        }
		request(options, callback);
	});
};

exports.getPlace = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "https://maps.googleapis.com";
        var path = "/maps/api/place/details/json?";
        path += "key=" + settings.API_KEY;
        path += "&placeid=" + id;
        request(host + path, function(error, response, body) {
            if (!error && response.statusCode === 200)
                resolve(JSON.parse(body));
            else
                reject(error);
        });
    });
};

exports.markVisited = function(lat, long, userid) {
	return Q.promise(function(reject, resolve, notify) {
		nearby(lat, long, 50)
		.then(function(res) {
			var now = Date.now();
			var locations = [];
			for (var location in res.results)
				locations.push(user.addVisited(userid, res.results[location].place_id,now));
			Q.all(locations)
				.then(function() {
					resolve(res.results.length);
				});
		})
		.fail(function(err) {
			reject(err);
		});
	});
};

exports.search = function(str) {
	return Q.promise(function(resolve, reject, notify) {
		var host = "https://maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + 1.19 + "," + 103.805;
        path += "&radius=" + 25000;
        path += "&types=" + placesTypes.join("|");
		path += "&name="  + str.replace(/ /g, "+");
        request(host + path, function(error, response, body) {
            if (!error && response.statusCode === 200)
                resolve(JSON.parse(body));
            else
                reject(error);
        });
	});
};