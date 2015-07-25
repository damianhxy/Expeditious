var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var locations = new nedb({filename: "./database/locations", autoload: true});
/*
    category: heritage | park | school | religious | restaurant | others
*/
exports.add = function(locationObj) {

};