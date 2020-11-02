const { validationResult } = require('express-validator');

/**
 * Takes an array describing the schema of the data
 * See express-validator documentation for more information
 * 
 * @param {Array} schema 
 * @returns {Array} - Array of middlewares to run, last being the error handler
 */
function validationMiddleware(schema) {
    return [
        ...schema, // include functions returned by the express-validator schema/methods
        (req, res, next) => {
            // check for errors and simply format to include just the error message
            const errors = validationResult(req).formatWith(({ msg }) => msg);

            // if there are no errors, escape
            if (errors.errors.length === 0) {
                return next();
            }

            // otherwise, send a 400
            res.status(400).json({
                errors: errors.mapped()
            });
        }
    ]
}

module.exports = validationMiddleware;
