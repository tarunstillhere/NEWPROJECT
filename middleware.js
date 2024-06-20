const { valid } = require("joi");
const {callerSchema} = require("./schemaValidation");
const {receiverSchema} = require("./schemaValidation");
const ExpressError = require("./ExpressError.js");


module.exports.validateCaller = (req,res,next) => {
    let {error} = callerSchema.validate(req.body);
    if(error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
        console.log(errMsg);
    }else {
        next();
    }
};
module.exports.validateReceiver = (req,res,next) => {
    let {error} = receiverSchema.validate(req.body);
    if(error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
        console.log(errMsg);
    }else {
        next();
    }
};

// module.exports.helper = (req,res,next) => {
//     req.body.caller.imgURL = req.file.path;
//     next();
// };

