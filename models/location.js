var Q = require("q");
var nedb = require("nedb");
var http = require("http");
var settings = require("../controllers/settings.js");
/*
    Carparks (HDB)
    name: name
    latitude: float
    longtitude: float
*/
var placesTypes = [
    "airport",
    "amusement_park",
    "aquarium",
    "art_gallery",
    "casino",
    "church",
    "hospital",
    "library",
    "mosque",
    "shopping_mall",
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
        http.request(options, callback).end();
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

exports.findNearby = function(lat, long, user) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + lat + "," + long;
        path += "&radius=" + user.preferences.radius;
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

exports.getPlace = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/details/json?";
        path += "key=" + settings.API_KEY;
        path += "&placeid" + id;
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