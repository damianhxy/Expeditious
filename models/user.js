var Q = require("q");
var nedb = require("nedb");
var bcryptjs = require("bcryptjs");
var users = new nedb({filename: "./database/users", autoload: true});

var all = exports.all = function() {
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
        if (password !== password2) return reject(Error("Password mismatch."));
        Q.ninvoke(users, "findOne", { username: username })
        .then(function(user) {
            if (user) return reject(Error("User already exists."));
            return Q.nfcall(bcryptjs.genSalt, 10);
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
                        "radius": 500 // metres
                    },
                    "visited": [], // {id, name, time}
					"joined": Date.now()
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

exports.generateLeaderboard = function() {
    return Q.promise(function(resolve, reject, notify) {
        var leaderboard = [];
		all()
		.then(function(users) {
			for (var user in users)
				leaderboard.push({
					"username": users[user].username,
					"visited": users[user].visited.length
				});
			leaderboard.sort(function(a, b) {
				if (b.time !== a.time)
					return b.time - a.time;
				return a.username > b.username;
			});
			leaderboard.map(function(e, i, a) {
                if (!i) e.rank = 1;
                else e.rank = a[i - 1].rank + (e.visited != a[i - 1].visited);
            });
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

exports.addVisited = function(userid, locationid, time) {
    return Q.promise(function(resolve, reject, notify) {
        Q.ninvoke(users, "findOne", { _id: userid })
        .then(function(user) {
            for (var entry in user.visited)
                if (user.visited[entry].id === locationid)
                    return resolve(); // Already marked
            location.get(locationid)
            .then(function(location) {
                user.visited.push({
                    id: locationid,
                    name: location.name,
                    time: time
                });
                return Q.ninvoke(users, "update", { _id: userid }, { $set: users });
            });
        })
        .then(function() {
            resolve();
        })
        .fail(function(err) {
            reject(err);
        });
    });
};