"use strict";

const express = require("express");
const app = express();
var PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  "h2lm1p": { longURL: "http://www.lighthouselabs.ca",
                owner: "a@a.com"
            }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

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

// ROUTES
app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase,
                       user: users[req.cookies["user_id"]] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (users[req.cookies["user_id"]]) {
    let templateVars = { user: users[req.cookies["user_id"]] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.post("/urls", (req, res) => {
  const creator = req.cookies["user_id"];
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {longURL: req.body.longURL, owner: creator};
  console.log(req.body);  // debug statement to see POST parameters
  console.log(urlDatabase);
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  if(longURL === undefined) {
    res.sendStatus(301);
  } else {
    res.redirect(longURL);
  }
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id,
                       longURL: urlDatabase[req.params.id],
                       user: users[req.cookies["user_id"]] };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  if(urlDatabase[req.params.id].owner === req.cookies["user_id"]) {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  } else {
    res.send("Not a creator of this URL!");
  }
});

// Updated long URL using POST
app.post("/urls/:id", (req, res) => {
  if(urlDatabase[req.params.id].owner === req.cookies["user_id"]) {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    console.log(req.body.longURL)
    res.redirect("/urls");
  } else {
    res.send("Not a creator, cannot edit!");
  }
});

app.post("/login", (req, res) => {
  const user = userByEmail(req.body.email);
  if(!users[user]){
    res.status(403).send("403 - Forbidden <br> E-mail cannot be found!")
  } else if (req.body.password !== users[user].password) {
      res.status(403).send("403 - Forbidden <br> Incorrect password!")
  } else {
    res.cookie('user_id', userByEmail(req.body.email));
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
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
                          password: req.body.password };
    res.cookie("user_id", userRandomID);
    res.redirect("/urls");
  }
});

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("_login", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});