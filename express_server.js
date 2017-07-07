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
  // Cookie Options
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
  // return !!Object.values(users).find((user) => user.email === email) // Only on nvm V7
  for (let uid in users) {
    if(users[uid].email === email) {
      return uid;
    }
  }
}

function httpChecker(longURL) {
  if (longURL.includes("http://")) {
    return longURL;
  } else {
    return ("http://" + longURL);
  }
}

// ROUTES
app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase[req.session.user_id],
                       user: users[req.session.user_id] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (users[req.session.user_id]) {
    let templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.post("/urls", (req, res) => {
  const userID = req.session.user_id;
  const shortURL = generateRandomString();
  if (urlDatabase[userID] === undefined) {
    urlDatabase[userID] = {};
    urlDatabase[userID][shortURL] = req.body.longURL;
  } else {
    urlDatabase[userID][shortURL] = req.body.longURL;
  }
  console.log(req.body);  // debug statement to see POST parameters
  console.log(urlDatabase);
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let longURL;
  for (let user in urlDatabase) {
    longURL = urlDatabase[user][req.params.shortURL];
    if(longURL) {
      break;
    }
  }
  if (longURL) {
    res.redirect(httpChecker(longURL));
  } else {
    res.sendStatus(404);
  }
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id,
                       longURL: urlDatabase[req.params.id],
                       user: users[req.session.user_id] };
  res.render("urls_show", templateVars);
});

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

// Updated long URL using POST
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

app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("_register", templateVars);
});

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

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  res.render("_login", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});