var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var locations = new nedb({filename: "./database/locations", autoload: true});
/*
    Locations
    name: name
    address: text
    location: { lang, long }
    description: text
    image: url
    opening hours: text
    gettingThere: text (public transport)
*/
/* Carparks (HDB)
    name: name
    location: { lang, long }
*/

exports.add = function(obj) {

};

exports.all = function() {

}

exports.get = function(id) {

};

// Findnearby