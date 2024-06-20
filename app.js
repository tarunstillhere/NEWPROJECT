if(process.env.NODE_ENV != "production") {
    require("dotenv").config();
}
require('dotenv').config();

const express = require("express");
const app = express();
const mongoose = require('mongoose');
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser"); // Add this line
const Caller = require("./models/caller.js");
const Receiver = require("./models/receiver.js");
const {validateCaller} = require("./middleware.js");
const {validateReceiver} = require("./middleware.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer = require("multer");
const {storage} = require("./cloudConfig.js");
const upload = multer({storage});
const {helper} = require("./middleware.js");
let MONGO_URL = "mongodb://127.0.0.1:27017/testing";

main()
.then(() => {
    console.log("Connected to DB");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const sessionOptions = {
    secret : "mysupersecretcode",
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 *1000,
        maxAge : 7 * 24 * 60 * 60 *1000,
        httpOnly : true,
    },
};

app.use(session(sessionOptions));

app.use(bodyParser.urlencoded({ extended: true })); // Add this line to parse form data
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Caller.authenticate()));

passport.serializeUser(Caller.serializeUser());
passport.deserializeUser(Caller.deserializeUser());

// app.get("/demouser", async (req,res) => {
//     let fakeUser = ({
//         username : "delta-student",
//         email : "john@gmail.com",
//         password : "fsdfad",
//         phoneNumber : "0989999090",
//         gender : "Male",
//         dob : "2006/02/20",
//         address : "fasdaasfadsas",
//         imgURL : "fsfasdffs",
//         language : "English",
//         status : "offline"
//     });

//     let registeredCaller = await Caller.register(fakeUser, "helloWorld");
//     console.log(registeredCaller);
// });

app.get("/listen", async (req, res) => {
    res.render("index.ejs");
});

app.get("/callerForm", (req, res) => {
    res.render("caller.ejs");
});

app.get("/receiverForm", (req, res) => {
    res.render("receiver.ejs");
});

app.post('/submitCall',validateCaller, async (req, res) => {  // upload.single("caller[imgURL]")
    // req.body.caller.phoneNumber = req.body.caller.countryCode+req.body.caller.phoneNumber;
    let newCaller = new Caller(req.body.caller);
    // console.log(newCaller);
    try {
        let registeredCaller = await Caller.register(req.body.caller, req.body.caller.password);
        res.redirect("/home");
    } catch (error) {
        // console.log(error.message)
        res.status(500).send("Error saving caller: " + error.message);
    }

});



app.post("/submitRec",validateReceiver, async (req,res) => {

    let newReceiver = new Receiver(req.body.receiver);
    console.log(newReceiver);

    try {
        let registeredReceiver = await Receiver.register(req.body.receiver, req.body.receiver.password);
        res.send("Successfully Connected");
    } catch (error) {
        
        res.status(500).send("Error saving receiver: " + error.message);
    }
})



app.get("/callerLogin", (req,res) => {
    res.render("callerLogin.ejs");
});

app.get("/receiverLogin", (req,res) => {
    res.render("receiverLogin.ejs");
});


app.post("/callerLogin",  passport.authenticate("local", {
    failureRedirect : "/",
    failureFlash : false,
   }), (req,res) =>{
    res.redirect("/home");
});

app.post("/receiverLogin",  passport.authenticate("local", {
    failureRedirect : "/",
    failureFlash : false,
   }), (req,res) =>{
    res.redirect("/home");
});

app.get("/", (req,res) => {
    res.send("Wrong Password");
});

app.get("/home", (req,res) => {
    res.send("Welcome to Listen.com");
});


app.listen(8080, () => {
    console.log("app is listening to port 8080");
});