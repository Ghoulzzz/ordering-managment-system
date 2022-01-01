// MODULES: express, mongodb, pug, connect-mongodb-session, express-session

// Initializes required modules
const express = require('express')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
let mongo = require("mongodb");
let MongoClient = mongo.MongoClient;

const app = express()

// Initialize the mongoDB session storage
let store = new MongoDBStore({
    uri: 'mongodb://localhost:27017/a4',
    collection: 'activeSession',
    saveUninitialized: false,
    resave: true
});

// Creates a session with a secret "secret" and sends the session to the mongoDB storage
app.use(session({ secret: 'secret', store: store}));
app.use(express.static("public"));
app.use(express.json());

// Handler for a GET request to the default url, which will supply a page if the user is loggedin or not
app.get("/", function (req, res) {
    if (req.session.loggedin) {
        res.status(200).render(__dirname + "/pages/homePageLoggedIn.pug", {name: req.session.username, id: req.session.profile.toString()});
    } else {
        res.status(200).render(__dirname + "/pages/homePage.pug");
    }
});

// Handle for a GET request to register a new user to the database
app.get("/register", function (req, res) {
    res.status(200).render(__dirname + "/pages/registerPage.pug");
});

// Handle for a POST request when the user wants to login, this will check the database and verify if the user/password information is correct, and update the session
app.post("/verifyLogin", function (req, res) {
    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
    
        if (err) {
            throw err;
        }
    
        db.collection("users").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            let username = req.body.username;
            let password = req.body.password;

            for (let i = 0;i < result.length;i++) {
                if (result[i].username === username) {
                    if (result[i].password === password) {
                        req.session.loggedin = true;
                        req.session.username = username;
                        req.session.profile = result[i]._id;
                        req.session.save();
                        res.sendStatus(200);
                    }
                }
            }
    });
    });
});

// Handle for a GET request to logout, it will update the session so that everything is loggedout and uninitialized
app.get("/logout", function (req, res) {
    req.session.loggedin = false;
    req.session.username = undefined;
    req.session.profile = undefined;
    req.session.save();
    res.redirect("/");
    res.status(200);
});

// Handle for a POST request to verify registering a new account. This will check if that username already exists in the database, if it does it will send back
// a status telling them it already exists, otherwise it will add the new account to the database
app.post("/verifyRegister", function (req, res) {
    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
    
        if (err) {
            throw err;
        }
    
        db.collection("users").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            let username = req.body.username;
            let password = req.body.password;
            let found = 0;

            for (let i = 0;i < result.length;i++) {
                if (result[i].username.toLowerCase() === username.toLowerCase()) {
                    found = 1;
                }
            }

            if (found == 0) {
                db.collection("users").insertOne({"username": username, "password": password, "privacy": false});

                db.collection("users").find({}).toArray(function(err, result) {
                    if (err) {
                        throw err;
                    }

                    for (let i = 0;i < result.length;i++) {
                        if (result[i].username.toLowerCase() === username.toLowerCase()) {
                            req.session.loggedin = true;
                            req.session.username = username;
                            req.session.profile = result[i]._id;
                            res.sendStatus(200);
                        }
                    }

                });
            } else {
                res.sendStatus(409);
            }
    });
    });
});

// Handle for a GET request to view the users, validates that the users are not private, and then sends forms to display NON-PRIVATE users
app.get("/users", function (req, res) {
    let specialQuery = req.query.name;

    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");

        if (err) {
            throw err;
        }

        db.collection("users").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            let nonPrivate = [];

            if (specialQuery === undefined) {
                for (let i = 0;i < result.length;i++) {
                    if (result[i].privacy != true) {
                        nonPrivate.push(result[i]);
    
                    }
                }

            } else {
                for (let i = 0;i < result.length;i++) {
                    if (result[i].privacy != true) {
                        if (result[i].username.toLowerCase().includes(specialQuery.toLowerCase())) {
                            nonPrivate.push(result[i]);
                        }
                    }
                }
            }

            if (req.session.loggedin) {
                res.status(200).render(__dirname + "/pages/usersPageIn.pug", {profiles: nonPrivate, name: req.session.username, id: req.session.profile.toString()});
            } else {
                res.status(200).render(__dirname + "/pages/usersPageOut.pug", {profiles: nonPrivate, name: req.session.username});
            }
        });
    });
});

// Handle for a GET request to view a users specific profile, if the user is non-private then it will display their profile with order information
// If the user is private it will send a 404 error
app.get("/users/:userID", function (req, res) {
    let searchUser = req.params.userID;
    let foundUser;
    let foundOrders = [];

    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
        
        if (err) {
            throw err;
        }

        db.collection("users").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            for (let i = 0;i < result.length;i++) {
                if (result[i]._id.equals(searchUser)) {
                    foundUser = result[i];
                    break;
                }
            }
        });

        db.collection("orders").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            for (let i = 0;i < result.length;i++) {
                if (result[i].orderName === foundUser.username) {
                    foundOrders.push(result[i]._id);
                }
            }

            if (foundUser != undefined) {
                if (req.session.username === foundUser.username) {
                    res.status(200).render(__dirname + "/pages/myprofilePage.pug", {name: req.session.username, id: req.session.profile.toString(), orders: foundOrders});
                } else {
                    if (foundUser.privacy === true) {
                        res.sendStatus(404);
                    } else {
                        if (req.session.loggedin === true) {
                            res.status(200).render(__dirname + "/pages/profilePageIn.pug", {name: req.session.username, id: req.session.profile.toString(), profilename: foundUser.username, orders: foundOrders});
                        } else {
                            res.status(200).render(__dirname + "/pages/profilePageOut.pug", {profilename: foundUser.username, orders: foundOrders});     
                        }
                    }
                }
            }
        });
    });
});

// Handle for a POST request when the user wants to change there privacy setting, if we recieve a 1 the privacy mode will be turned on, otherwise we turn off the privacy mode
app.post("/changeprivacy", function (req, res) {
    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
        
        if (err) {
            throw err;
        }

        if (req.body.privacy == 1) {
            db.collection("users").updateOne({"_id": req.session.profile}, {$set: {"privacy": true}}, function(err, res) {
                if (err) {
                    throw err;
                }
            });
            res.sendStatus(200);
        } else {
            db.collection("users").updateOne({"_id": req.session.profile}, {$set: {"privacy": false}}, function(err, res) {
                if (err) {
                    throw err;
                }
            }); 
            res.sendStatus(200);
        }
    });
});

// Handle for a GET request to give the page of the orderform
// Makes sure the user is logged in
app.get("/orderFood", function (req, res) {
    if (req.session.loggedin) {
        res.status(200).render(__dirname + "/pages/orderform.pug", {name: req.session.username, id: req.session.profile.toString()});
    } else {
        res.sendStatus(404);
    }
});

// Handle for a POST request with the users order, and adds it into the collection "orders"
app.post("/orders", function (req, res) {
    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
        
        if (err) {
            throw err;
        }

        db.collection("orders").insertOne({"orderName": req.session.username, "restaurantName": req.body.restaurantName, "items": req.body.order, "subtotal": req.body.subtotal, "tax": req.body.tax, "deliveryFee": req.body.fee, "total": req.body.total});
        res.sendStatus(200);
    });
});

// Handle for a GET request to view a specific order, if the users page is not private then the order is displayed, otherwise a 404 error is thrown
app.get("/orders/:orderID", function (req, res) {
    let ordID = req.params.orderID;
    let foundOrder;
    let foundOrderPerson;
    MongoClient.connect("mongodb://localhost:27017/a4", function(err, client) {
        var db = client.db("a4");
        
        if (err) {
            throw err;
        }

        db.collection("orders").find({}).toArray(function(err, result) {
            if (err) {
                throw err;
            }

            for (let i = 0;i < result.length;i++) {
                if (result[i]._id.equals(ordID)) {
                    foundOrder = result[i];
                    break;
                }
            }
        });

            db.collection("users").find({}).toArray(function(err, result) {
                if (err) {
                    throw err;
                }
    
                for (let i = 0;i < result.length;i++) {
                    if (result[i].username === foundOrder.orderName) {
                        foundOrderPerson = result[i];
                        break;
                    }
                }

                if (foundOrder != undefined) {
                    if (req.session.username === foundOrderPerson.username) {
                        res.status(200).render(__dirname + "/pages/summaryPageIn.pug", {name: req.session.username, id: req.session.profile.toString(), orderName: foundOrder.orderName, restaurantName: foundOrder.restaurantName, items: foundOrder.items, subtotal: foundOrder.subtotal, tax: foundOrder.tax, deliveryFee: foundOrder.deliveryFee, total: foundOrder.total});
                    } else {
                        if (foundOrderPerson.privacy != true) {
                            if (req.session.loggedin) {
                                res.status(200).render(__dirname + "/pages/summaryPageIn.pug", {name: req.session.username, id: req.session.profile.toString(), orderName: foundOrder.orderName, restaurantName: foundOrder.restaurantName, items: foundOrder.items, subtotal: foundOrder.subtotal, tax: foundOrder.tax, deliveryFee: foundOrder.deliveryFee, total: foundOrder.total});
                            } else {
                                res.status(200).render(__dirname + "/pages/summaryPageOut.pug", {orderName: foundOrder.orderName, restaurantName: foundOrder.restaurantName, items: foundOrder.items, subtotal: foundOrder.subtotal, tax: foundOrder.tax, deliveryFee: foundOrder.deliveryFee, total: foundOrder.total});
                            }
                        } else {
                            res.sendStatus(404);
                        }
                    }
                }
            });
    });
});

// Creates the server on the local port 3000
app.listen(3000);
console.log("Server listening at http://localhost:3000");
