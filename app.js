if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}
require('dotenv').config();

const express = require("express");
const app = express();
const mongoose = require('mongoose');
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const Caller = require("./models/caller.js");
const Receiver = require("./models/receiver.js");
const OTP = require("./models/otp.js");
const { validateCaller, validateReceiver } = require("./middleware.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const transporter = require('./emailConfig');
const { v4: uuidv4 } = require('uuid');
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
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Caller.authenticate()));

passport.serializeUser(Caller.serializeUser());
passport.deserializeUser(Caller.deserializeUser());

app.get("/listen", async (req, res) => {
    res.render("index.ejs");
});

app.get("/callerForm", (req, res) => {
    res.render("caller.ejs");
});

app.get("/receiverForm", (req, res) => {
    res.render("receiver.ejs");
});

app.post('/submitCall',upload.none(), validateCaller, async (req, res) => {
    let newCaller = new Caller(req.body.caller);

    try {
        // Send OTP
        const otp = uuidv4().split('-')[0]; // Generate a simple OTP
        await OTP.create({ email: req.body.caller.email, otp });

        const mailOptions = {
            from: 'tarunchauhan01221@gmail.com',
            to: req.body.caller.email,
            subject: 'Email Verification Code',
            text: `Your verification code is ${otp}`
        };

        transporter.sendMail(mailOptions,async (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send("Error sending email: " + error.message);
            }
            let registeredCaller = await Caller.register(req.body.caller, req.body.caller.password);
            res.redirect("/verifyEmail");
        });
        console.log("registered Successfully");
    } catch (error) {
        res.status(500).send("Error saving caller: " + error.message);
    }
});

app.get("/verifyEmail", (req, res) => {
    res.render("verifyEmail.ejs");
});

app.post("/verifyEmail", async (req, res) => {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (otpRecord) {
        // OTP is valid
        await OTP.deleteOne({ email, otp }); // Remove the used OTP
        res.send("Email verified successfully!");
    } else {
        // OTP is invalid
        res.status(400).send("Invalid OTP");
    }
});

app.get("/receiverForm", (req, res) => {
    res.render("receiver.ejs");
});

app.post("/submitRec", validateReceiver, async (req, res) => {
    let newReceiver = new Receiver(req.body.receiver);
    console.log(newReceiver);

    try {
        let registeredReceiver = await Receiver.register(req.body.receiver, req.body.receiver.password);
        res.send("Successfully Connected");
    } catch (error) {
        res.status(500).send("Error saving receiver: " + error.message);
    }
});

app.get("/callerLogin", (req, res) => {
    res.render("callerLogin.ejs");
});

app.get("/receiverLogin", (req, res) => {
    res.render("receiverLogin.ejs");
});

app.post("/callerLogin", passport.authenticate("local", {
    failureRedirect: "/",
    failureFlash: false,
}), (req, res) => {
    res.redirect("/home");
});

app.post("/receiverLogin", passport.authenticate("local", {
    failureRedirect: "/",
    failureFlash: false,
}), (req, res) => {
    res.redirect("/home");
});

app.get("/", (req, res) => {
    res.send("Wrong Password");
});

app.get("/home", (req, res) => {
    res.send("Welcome to Listen.com");
});

app.listen(8080, () => {
    console.log("app is listening to port 8080");
});

const { callerSchema, receiverSchema } = require("./schemaValidation");

module.exports.validateCaller = (req, res, next) => {
    let { error } = callerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        console.log(errMsg);
        return res.status(400).send(errMsg); // Send a response with the error message
    } else {
        next();
    }
};

module.exports.validateReceiver = (req, res, next) => {
    let { error } = receiverSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        console.log(errMsg);
        return res.status(400).send(errMsg); // Send a response with the error message
    } else {
        next();
    }
};


app.use((err,req,res,next)=> {
    let {statusCode = 500, message= "Something Went Wrong !"} = err;
    res.status(statusCode).render("error.ejs", {message});
    // res.status(statusCode).send(message);
});