jest.mock('../database/schema/validateSchema.js', () => {
    return jest.fn();
});
const Database = require("../database/Database.mock");
const DatabaseQuery = require("../database/DatabaseQuery");
const validateSchema = require("../database/schema/validateSchema");
const Model = require("./Model");

const mockDb = new Database(['mockmodel_table']);

class MockModel extends Model {
    static primaryKey = 'id';
    static tableName = 'mockmodel_table';
    static schema = {};
    static database = mockDb
}

describe('Model class', () => {
    afterEach(async () => {
        jest.clearAllMocks();
        await mockDb.write({ mockmodel_table: [] });
    });

    it('Throws an error when instantiated directly', () => {
        expect(() => new Model()).toThrow();
    });

    describe('When instantiated as a class that inherits from Model', () => {
        it('Does not throw an error', () => {
            expect(() => new MockModel()).not.toThrow();
        });

        it('Puts passed properties into the model object', () => {
            const model = new MockModel({ name: 'Wiktor', age: 24 });

            expect(model.age).toEqual(24);
            expect(model.name).toEqual('Wiktor');
        });
    
        describe('.query() static method', () => {
            it('When executed, it returns a new instance of DatabaseQuery', () => {
                const result = MockModel.query();
                
                expect(result).toBeInstanceOf(DatabaseQuery);
            });
        });

        describe('.load() method', () => {
            it('Loads all the information from the database about this entry by the primary key', async () => {
                // first let's save an entry to the database
                const newEntry = new MockModel({ name: 'Edward', age: 64 });
                await newEntry.save();

                // now let's create a new instance with just the id of 1 and let's call load() to get the info from the database
                const toLoad = new MockModel({ id: 1 });
                await toLoad.load();

                expect(toLoad.name).toEqual('Edward');
                expect(toLoad.age).toEqual(64)
            });
        });

        describe('.validate() method', () => {
            it('calls the validateSchema() function', async () => {
                const model = new MockModel({ name: 'Mike' });
                jest.spyOn(model, 'validate');
                await model.validate();

                expect(validateSchema).toHaveBeenCalledWith(MockModel.schema, model);
            });
        });

        describe('.save() method', () => {
            it('calls the .validate() method', async () => {
                const model = new MockModel({ name: 'Mike' });
                jest.spyOn(model, 'validate');
                await model.save();

                expect(model.validate).toHaveBeenCalled();
            });
        });
    });
});