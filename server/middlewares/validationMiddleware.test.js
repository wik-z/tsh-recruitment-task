const validationMiddleware = require("./validationMiddleware");
const { body, validationResult } = require('express-validator');

const mockResponse = {
    json: jest.fn(),
    status: jest.fn().mockImplementation(() => mockResponse)
};

const mockNext = jest.fn();

async function runMiddlewares(middlewares, request, response, next) {
    for (let handler of middlewares) {
        const handlerResult = handler(request, response, next);

        if (handlerResult instanceof Promise) await handlerResult;
    }
}

describe('Validation Middleware', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Returns an array of handlers', async () => {
        const firstHandler = () => {};
        const secondHandler = () => {};

        const result = validationMiddleware([
            firstHandler, 
            secondHandler
        ]);

        expect(result).toBeInstanceOf(Array);
        expect(result).toHaveLength(3);
        result.forEach(entry => expect(entry).toBeInstanceOf(Function));
        expect(result[0]).toBe(firstHandler);
        expect(result[1]).toBe(secondHandler);
    });

    describe('When there is no errors', () => {
        it('Calls the next() method', async () => {
            const mockRequest = {
                body: {
                    numberValue: 12,
                    stringValue: 'Lorem Ipsum' 
                }
            };

            const schema = [ 
                body('numberValue').isInt(),
                body('stringValue').isString()
            ]; 
    
            const result = validationMiddleware(schema);
    
            // run the middleware
            await runMiddlewares(result, mockRequest, mockResponse, mockNext);
    
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledTimes(schema.length + 1);
        });
    });

    describe('When there are validation errors', () => {
        it('Calls the response with an error status and a map of errors', async () => {
            const mockRequest = {
                body: {
                    numberValue: 'Lorem Ipsum',
                    stringValue: 139 
                }
            };            
            
            const schema = [ 
                body('numberValue').isInt(),
                body('stringValue').isString()
            ]; 
    
            const result = validationMiddleware(schema);
    
            await runMiddlewares(result, mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(schema.length); // methods in schema will always call next()
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalled();
            
            const mappedErrors = mockResponse.json.mock.calls[0][0];

            expect(mappedErrors.errors).toBeInstanceOf(Object);
            expect(typeof mappedErrors.errors.numberValue).toEqual('string');
            expect(typeof mappedErrors.errors.stringValue).toEqual('string');
        });
    });
});