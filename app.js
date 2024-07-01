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
// const { validateCaller, validateReceiver } = require("./middleware.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const transporter = require('./emailConfig');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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

const { validateCaller, validateReceiver } = require("./middleware.js");
// Add moment.js for handling time
const moment = require("moment");

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

let temp = {};

const storeData = (req,res,next) => {
   temp = req.body;
    next();
}
app.get("/listen", async (req, res) => {
    res.render("index.ejs");
});

app.get("/callerForm", (req, res) => {
    res.render("caller.ejs");
});

app.post('/submitCall',upload.none(), validateCaller,storeData, async (req, res) => {
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
            
            res.redirect("/verifyEmail");
        });
        console.log("registered Successfully");
    } catch (error) {
        res.status(500).send("Error saving caller: " + error.message);
    }
});

app.get("/verifyEmail", (req, res) => {
    res.render("verifyEmail.ejs", { email: temp.caller.email });
});

app.post("/verifyEmail", async (req, res) => {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (otpRecord && moment().isBefore(moment(otpRecord.createdAt).add(5, 'minutes'))) {
        // OTP is valid and not expired
        await OTP.deleteOne({ email, otp }); // Remove the used OTP
        let user = temp;
        temp = {};
        let registeredCaller = await Caller.register(user.caller, user.caller.password);
        res.send("Email verified successfully!");
    } else {
        // OTP is invalid or expired
        res.status(400).send("Invalid or expired OTP");
    }
});


app.get("/receiverForm", (req, res) => {
    res.render("receiver.ejs");
});

app.post('/submitRec',upload.none(), validateReceiver,storeData, async (req, res) => {
    let newReceiver = new Receiver(req.body.receiver);

    try {
        // Send OTP
        const otp = uuidv4().split('-')[0]; // Generate a simple OTP
        await OTP.create({ email: req.body.receiver.email, otp });

        const mailOptions = {
            from: 'tarunchauhan01221@gmail.com',
            to: req.body.receiver.email,
            subject: 'Email Verification Code',
            text: `Your verification code is ${otp}`
        };

        transporter.sendMail(mailOptions,async (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send("Error sending email: " + error.message);
            }
            
            res.redirect("/verifyEmail");
        });
        console.log("registered Successfully");
    } catch (error) {
        res.status(500).send("Error saving receiver: " + error.message);
    }
});

app.get("/verifyEmail", (req, res) => {
    res.render("verifyEmail.ejs", { email: temp.receiver.email });
});

app.post("/verifyEmail", async (req, res) => {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (otpRecord && moment().isBefore(moment(otpRecord.createdAt).add(5, 'minutes'))) {
        // OTP is valid and not expired
        await OTP.deleteOne({ email, otp }); // Remove the used OTP
        let user = temp;
        temp = {};
        let registeredReceiver = await Caller.register(user.receiver, user.receiver.password);
        res.send("Email verified successfully!");
    } else {
        // OTP is invalid or expired
        res.status(400).send("Invalid or expired OTP");
    }
});


// Add a new route for resending OTP

app.post("/resendOtp", async (req, res) => {
    const { email } = req.body;
    try {
        // Check if the OTP was already sent within the last 30 seconds
        const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
        if (recentOtp && moment().isBefore(moment(recentOtp.createdAt).add(30, 'seconds'))) {
            return res.status(400).send("Please wait before requesting another OTP.");
        }

        // Generate and send a new OTP
        const otp = uuidv4().split('-')[0]; // Generate a simple OTP
        await OTP.create({ email, otp });

        const mailOptions = {
            from: 'tarunchauhan01221@gmail.com',
            to: email,
            subject: 'Email Verification Code',
            text: `Your verification code is ${otp}`
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send("Error sending email: " + error.message);
            }

            res.status(200).send("OTP resent successfully");
        });
    } catch (error) {
        res.status(500).send("Error resending OTP: " + error.message);
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

// Route to render the password reset request form
app.get('/forgotPassword', (req, res) => {
    res.render('forgotPassword.ejs');
});

// Route to handle the password reset request
app.post('/forgotPassword', async (req, res) => {
    const { email } = req.body;
    const user = await Caller.findOne({ email }) || await Receiver.findOne({ email });

    if (!user) {
        return res.status(400).send("No account with that email found.");
    }

    // Generate a token
    const token = crypto.randomBytes(20).toString('hex');

    // Set token and expiration on the user model
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send the email
    const mailOptions = {
        from: 'tarunchauhan01221@gmail.com',
        to: user.email,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n
               http://${req.headers.host}/reset/${token}\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
            console.error('There was an error: ', err);
        } else {
            res.status(200).send('Recovery email sent');
        }
    });
});

// Route to render the password reset form
app.get('/reset/:token', async (req, res) => {
    const user = await Caller.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }) ||
                 await Receiver.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
        return res.status(400).send("Password reset token is invalid or has expired.");
    }

    res.render('resetPassword.ejs', { token: req.params.token });
});

// Route to handle the password reset form submission
app.post('/reset/:token', async (req, res) => {
    const user = await Caller.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }) ||
                 await Receiver.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
        return res.status(400).send("Password reset token is invalid or has expired.");
    }

    user.setPassword(req.body.password, async (err) => {
        if (err) {
            return res.status(500).send("Error resetting password.");
        }

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).send("Password has been reset successfully.");
    });
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