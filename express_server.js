"use strict";

const express = require("express");
const app = express();
var PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');


app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

const urlDatabase = {};

const users = {};

function generateRandomString() {
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomString = "";
  for (let i = 6; i > 0; --i) {
    randomString += chars[Math.floor(Math.random() * chars.length)];
  }
  return randomString;
}

function userByEmail(email) {
  for (let uid in users) {
    if(users[uid].email === email) {
      return uid;
    }
  }
}

// Checks to see if longURL has http:// attached to it
// And if not, add it onto the longURL
function httpChecker(longURL) {
  if (longURL.includes("http://")) {
    return longURL;
  } else {
    return ("http://" + longURL);
  }
}

// If not logged in, then redirected to Login page
app.get("/", (req, res) => {
  if (req.session.user_id !== null) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase[req.session.user_id],
                       user: users[req.session.user_id] };
  res.render("urls_index", templateVars);
});

// If not logged in, then automatically redirected to Login page
app.get("/urls/new", (req, res) => {
  if (users[req.session.user_id]) {
    let templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Submit short:longURLS into URL Database
app.post("/urls", (req, res) => {
  const userID = req.session.user_id;
  const shortURL = generateRandomString();
  if (urlDatabase[userID] === undefined) {
    urlDatabase[userID] = {};
    urlDatabase[userID][shortURL] = req.body.longURL;
  } else {
    urlDatabase[userID][shortURL] = req.body.longURL;
  }
  console.log(urlDatabase);
  res.redirect("/urls");
});

// Redirection using shortURL
app.get("/u/:shortURL", (req, res) => {
  let longURL;
  for (let user in urlDatabase) {
    longURL = urlDatabase[user][req.params.shortURL];
    if(longURL) {
      break;
    }
  }
  if (longURL) {
    res.redirect(httpChecker(longURL)); // Checks or adds "http://"
  } else {
    res.sendStatus(404);
  }
});

// Page shows short:long URLs of logged-in user
app.get("/urls/:id", (req, res) => {
  if(!users[req.params.id]) {
    res.sendStatus(404);
  } else {
    let templateVars = { shortURL: req.params.id,
                         longURL: urlDatabase[req.params.id],
                         user: users[req.session.user_id] };
    res.render("urls_show", templateVars);
  }
});

// Only the creator of the link can delete it
app.post("/urls/:id/delete", (req, res) => {
  const userID = req.session.user_id;
  const shortURL = req.params.id;
  if(urlDatabase[userID][shortURL]) {
    delete urlDatabase[userID][shortURL];
    res.redirect("/urls");
  } else {
    res.send("Not a creator of this URL!");
  }
});

// Update long URL (same shortURL) using POST
app.post("/urls/:id", (req, res) => {
  const userID = req.session.user_id;
  const shortURL = req.params.id;
  if(urlDatabase[userID][shortURL]) {
    urlDatabase[userID][shortURL] = req.body.longURL;
    console.log(req.body.longURL, req.body.longURL);
    res.redirect("/urls");
  } else {
    res.send("Not a creator, cannot edit!");
  }
});

/* REGISTRATION && LOGIN/LOGOUT FEATURES BELOW */

// Registration page
app.get("/register", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("_register", templateVars);
});

// Registration errors:
// Email and password cannot be blank OR email already exists
app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send("400 - Bad Request <br> Email or password cannot be blank!");
  } else if (users[userByEmail(req.body.email)]) {
    res.status(400).send("400 - Bad Request <br> That email already exists!");
  } else {
    let userRandomID = generateRandomString();
    users[userRandomID] = { id: userRandomID,
                          email: req.body.email,
                          password: bcrypt.hashSync(req.body.password, 10) };
    console.log(users);
    req.session.user_id = userRandomID;
    res.redirect("/urls");
  }
});

// Login page
app.get("/login", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("_login", templateVars);
});

// Cannot login if wrong email or incorrect password
app.post("/login", (req, res) => {
  const user = userByEmail(req.body.email);
  if(!users[user]){
    res.status(403).send("403 - Forbidden <br> E-mail cannot be found!")
  } else if (!bcrypt.compareSync(req.body.password, users[user].password)) {
      res.status(403).send("403 - Forbidden <br> Incorrect password!")
  } else {
    req.session.user_id = userByEmail(req.body.email);
    res.redirect("/urls");
  }
});

// Logout and set session cookie to null
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/urls");
});

// Connection with port 8080
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});