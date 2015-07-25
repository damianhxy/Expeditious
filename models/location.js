var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var locations = new nedb({filename: "./database/locations", autoload: true});
/*
    Locations
    name: name
    address: text
    location: { lat, long }
    description: text
    image: url
    opening hours: text
    gettingThere: text (public transport)
*/
/* Carparks (HDB)
    name: name
    location: { lat, long }
*/

exports.add = function(obj) {

};

exports.all = function() {

}

exports.get = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(location, "findOne", { _id: id})
        .then(function(location) {
            resolve(location);
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

// exports.findNearby = function(lang, long) {}