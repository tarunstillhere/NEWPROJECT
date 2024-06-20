const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tarunchauhan01221@gmail.com', // your email
        pass: 'smqsrizstbqudzgu' // your email password
    }
});

module.exports = transporter; 
