var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var users = new nedb({filename: "./database/users", autoload: true});

exports.authenticate = function(username, password) {
    return Q.promise(function(resolve, reject, notify) {
        return Q.ninvoke(users, "findOne", { username: username })
        .then(function(user) {
            if (!user) return reject(Error("User does not exist."));
            Q.ninvoke(bcryptjs, "compare", password, user.hash)
            .then(function(res) {
                if (res) return resolve(user);
                reject(Error("Wrong Password"));
            });
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.create = function(name, username, password) {
    return Q.promise(function(resolve, reject, notify) {
        return Q.ninvoke(users, "findOne", { username: username })
        .then(function(user) {
            if (user) return reject(Error("User already exists."));
            return Q.nfcall(bcryptjs.gensalt, 10);
        })
        .then(function(salt) {
            return Q.nfcall(bcryptjs.hash, password, salt)
            .then(function(hash) {
                var user = {
                    "name": name,
                    "username": username,
                    "hash": hash,
                    "salt": salt
                };
                return Q.ninvoke(users, "insert", user);
            });
        })
        .then(function(user) {
            resolve(user);
        })
        .fail(function(err) {
            reject(err);
        });
    });
};