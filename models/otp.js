const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const otpSchema = new Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, default: Date.now, expires: '5m' } // OTP expires in 5 minutes
});

module.exports = mongoose.model('OTP', otpSchema);