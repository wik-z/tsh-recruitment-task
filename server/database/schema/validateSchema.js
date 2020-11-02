const validator = require('express-validator');

// Technically express-validator is only created for request validation
// however, I'd like to reuse the same schema for both request and model validation
// therefore I'll allow the validator to think it's a request

/**
 * Validates non-request data with express-validator
 * If any issues are found, it throws an error (promise is rejected)
 * 
 * @param {Schema} schema 
 * @param {Model} data
 * 
 * @returns {Promise} 
 */
async function validateSchema(schema, data) {
    // simplistic request-like mock
    const toValidate = { body: data };
    // use validator's checkSchema method to get the list of middlewares
    const validationChain = validator.checkSchema(schema);

    // run each middleware with mock data
    for (const handler of validationChain) {
        const result = handler(toValidate, undefined, () => {});

        if (result instanceof Promise) {
            // if middleware is async, wait for it to finish
            await result;
        }
    }

    // get errors from validation
    const errors = validator.validationResult(toValidate).array();

    // if it didn't pass the validation, throw the first error
    if (errors.length > 0) {
        const { param, msg } = (errors[0]);
        throw new Error(`Model validation failed. Field '${param}': ${msg}`);
    }
}

module.exports = validateSchema;