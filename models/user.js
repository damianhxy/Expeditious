var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var users = new nedb({filename: "./database/users", autoload: true});
var locations = require("./location.js");

exports.all = function() {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "find", {})
        .then(function(list) {
            resolve(list);
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.authenticate = function(username, password) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { username: username })
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
        Q.ninvoke(users, "findOne", { username: username })
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
                    "salt": salt,
                    "preferences": {
                        "radius": 500
                    },
                    "wishlist": [],
                    "visited": [],
                    "following": [], // User is following them {userid, username, score}
                    "followers": [], // User is being followed {userid}
                    "visited": [] // name, time
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

exports.generateLeaderboard = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: id })
        .then(function(user) {

        })
        .fail(function(err) {

        });
    });
};

var get = exports.get = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: id })
        .then(function(user) {
            resolve(user);
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.toggleFollow = function(userid, targetid) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: userid })
        .then(function(user) {
            var location = -1;
            for (var followee in user)
                if (user[followee].id === targetid)
                    location = followee;
            if (~ location)
                users.following.splice(location, 1);
            else
                get(targetid)
                .then(function(target) {
                    user.following.push({
                        username: target.username,
                        userid: targetid,
                        score: target.visited.length
                    });
                    return Q.ninvoke(users, "update", { _id: userid }, { $set: user });
                });
        })
        .then(function() {
            return Q.ninvoke(users, "findOne", { _id: targetid });
        })
        .then(function(target) {
            var location = user.followers.indexOf(userid);
            if (~ location)
                user.followers.push(userid);
            else
                user.following.splice(userid, 1);
            return Q.ninvoke(users, "update", { _id: targetid }, { $set: target });
        })
        .then(function() {
            resolve();
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.addVisited = function(userid, locationid, time) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: userid })
        .then(function(user) {
            location.get(locationid)
            .then(function(location) {
                for (var history in user.visited)
                    if (user.visited[history].name === location.name)
                        return reject(Error("Illegal: User attempted to visit location again."));
                user.visited.push({
                    name: location.name,
                    time: time
                });
                return Q.ninvoke(users, "update", { _id: userid }, { $set: user });
            });
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

exports.toggleWishlist = function(userid, locationid) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: userid })
        .then(function(user) {
            var location = users.wishlist.indexOf(locationid);
            if (~ location)
                users.wishlist.push(locationid);
            else
                users.wishlist.splice(location, 1);
            return Q.ninvoke(users, "update", { _id: userid }, { $set: user });
        })
        .then(function() {
            resolve();
        })
        .fali(function(err) {
            reject(err);
        });
    });
};