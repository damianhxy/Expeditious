var Q = require("q");
var nedb = require("nedb");
var https = require("https");
var settings = require("../controllers/settings.js");
var users = require("./user.js");
/*
    Carparks (HDB)
    name: name
    latitude: float
    longtitude: float
*/
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

function getRequest(options) {
    return Q.promise(function(resolve, reject, notify) {
        var callback = function(res) {
            var response = "";
            res.on("data", function(chunk) {
                response += chunk;
            });
            res.on("end", function() {
                resolve(response);
            });
        }
        https.request(options, callback).end();
    });
}

exports.busCost = function(startLat, startLong, endLat, endLong) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/directions/json?";
        path += "origin=" + startLat + "," + startLong;
        path += "&destination=" + endLat + "," + endLong;
        path += "&mode=transit";
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            var totalCost = 0;
            res = JSON.parse(res);
            res.routes.forEach(function(e) {
                if (e.fare)
                    totalCost += e.fare.value;
            });
            resolve(totalCost);
        })
        .fail(function(err) {
            reject(err);
        })
    });
};

var nearby = exports.findNearby = function(lat, long, radius) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + lat + "," + long;
        path += "&radius=" + radius;
        path += "&types=" + placesTypes.join("|");
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            resolve(JSON.parse(res));
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.findNearbyCarparks = function(lat, long, radius) {
	return Q.promise(function(resolve, reject, notify) {
		var host = "datamall.mytransport.sg";
		var path = "/ltaodataservice.svc/CarParkSet";
		path += "AccountKey=" + settings.ACCOUNT_KEY;
		path += "&UniqueUserID=" + settings.UniqueUserID;
		path += "&accept=application/json";
		console.log(path);
		getRequest({
			host: host,
			path: path
		})
		.then(function(res) {
			resolve(JSON.parse(res));
		})
		.then(function(err) {
			reject(err);
		});
	});
};

exports.getPlace = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/details/json?";
        path += "key=" + settings.API_KEY;
        path += "&placeid=" + id;
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            resolve(JSON.parse(res));
        })
        .fail(function(err) {
            reject(err);
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
		var host = "maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + 1.19 + "," + 103.805;
        path += "&radius=" + 25000;
        path += "&types=" + placesTypes.join("|");
		path += "&name="  + str.replace(/ /g, "+");
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            resolve(JSON.parse(res));
        })
        .fail(function(err) {
            reject(err);
        });
	});		
};