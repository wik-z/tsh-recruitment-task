const validateSchema = require("./validateSchema")

const schema = {
    name: {
        isString: true,
        isLength: {
            options: {
                min: 1,
                max: 32
            }
        }
    },
    yearOfBirth: {
        isInt: {
            options: {
                min: 1900,
                max: (new Date()).getFullYear()
            }
        }
    }
};

describe('validateSchema function', () => {
    describe('When data doesn\'t match schema', () => {
        it('throws an error if passed data doesn\'t match schema', () => {
            const data = {
                name: 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr',
                yearOfBirth: (new Date()).getFullYear() + 1
            };
    
            expect((async () => {
                await validateSchema(schema, data);
            })()).rejects.toThrowError();
        });
    });

    describe('When data matches schema', () => {
        it('doesn\'t throw any errors and doesn\'t return anything', () => {
            const data = {
                name: 'Trevor Philips',
                yearOfBirth: 1986
            };
    
            expect((async () => {
                await validateSchema(schema, data);
            })()).resolves.toBeUndefined();
        });
    });
});