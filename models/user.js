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

exports.create = function(name, username, password, password2) {
    return Q.promise(function(resolve, reject, notify) {
        if (password !== password2) return reject(Error("Password mistmatch."));
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
                    "following": [], // User is following them {userid}
                    "visited": [] // {id, name, time}
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
        var leaderboard = [];
        Q.ninvoke(users, "findOne", { _id: id })
        .then(function(user) {
            var followers = [];
            for (var follower in user.following)
                followers.push(get(user.following[follower]));
            return Q.all(followers);
        })
        .then(function(followers) {
            for (var follower in followers)
                leaderboard.push({
                    username: followers[follower].username,
                    visited: followers[follower].visited.length
                });
            leaderboard.sort(function(a, b) {
                return b.visited - a.visited; // Higher comes first
            });
            leaderboard.map(function(e, i, a) {
                if (!i) e.rank = 1;
                else e.rank = a[i - 1].rank + (e.visited != a[i - 1].visited);
            });
        })
        .then(function() {
            resolve(leaderboard);
        })
        .fail(function(err) {
            reject(err);
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
            var location = user.following.indexOf(targetid);
            if (~ location)
                users.following.splice(location, 1);
            else
                users.following.push(userid);
            return Q.ninvoke(users, "update", { _id: userid }, { $set: user });
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
            for (var entry in user.visited)
                if (user.visited[entry].id === locationid)
                    return reject(Error("Illegal attempt to revisit place"));
            location.get(locationid)
            .then(function(location) {
                user.visited.push({
                    id: locationid,
                    name: location.name,
                    time: time
                });
                return Q.ninvoke(users, "update", { _id: userid }, { $set: users });
            })
        })
        .then(function() {
            resolve();
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