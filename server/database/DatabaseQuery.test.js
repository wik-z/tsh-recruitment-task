const DatabaseQuery = require("./DatabaseQuery");
const Database = require('./Database.mock');
const Model = require("../models/Model");

class MockModel extends Model {
    static tableName = 'mock_table_1';
    static schema = {};
}

describe('DatabaseQuery class', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Instance stores the passed Database instance and Model class in the properties', () => {
        const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));

        expect(query.database).toBeInstanceOf(Database);
        expect(query.model).toBe(MockModel);
    });

    describe('.loadDatabase() method', () => {
        it('Returns the database content without loading it into the query data', async () => {
            const database = new Database([MockModel.tableName]);
            jest.spyOn(database, 'read');
            const query = new DatabaseQuery(MockModel, database);

            await query.loadDatabase();
            expect(query.database.read).toHaveBeenCalled();
            expect(query.data).toHaveLength(0);
        });
    });

    describe('.loadData() method', () => {
        it('Returns the table content and stores it in the data property', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                mock_table_1: [
                    { id: 1 },
                    { id: 2 }
                ]
            })

            const query = new DatabaseQuery(MockModel, database);
            jest.spyOn(query, 'loadDatabase');

            const response = await query.loadData();
            expect(query.loadDatabase).toHaveBeenCalled();
            expect(query.data).toHaveLength(2);
            expect(response).toHaveLength(2);
        });
    });

    describe('.addToPipeline() method', () => {
        it('Adds passed filtering function to the pipeline array', () => {
            const database = new Database([MockModel.tableName]);
            const query = new DatabaseQuery(MockModel, database);

            const customHandler = jest.fn();
            const anotherCustomHandler = jest.fn();
            query.addToPipeline(customHandler);
            query.addToPipeline(anotherCustomHandler);

            expect(query.pipeline).toHaveLength(2);
            expect(query.pipeline[0]).toBe(customHandler);
            expect(query.pipeline[1]).toBe(anotherCustomHandler);
        });
    });

    describe('.execute() method', () => {
        it('Loads the table content before every execution', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                mock_table_1: [
                    { id: 1 },
                    { id: 2 }
                ]
            })

            const query = new DatabaseQuery(MockModel, database);
            jest.spyOn(query, 'loadData');

            await query.execute();

            expect(query.loadData).toHaveBeenCalled();
        });

        it('Runs the filter handlers in the pipeline', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                mock_table_1: [
                    { id: 1 },
                    { id: 2 }
                ]
            })

            const query = new DatabaseQuery(MockModel, database);
            const mockFilter = jest.fn().mockImplementation(data => data);
            const anotherMockFilter = jest.fn().mockImplementation(data => data);

            query.addToPipeline(mockFilter);
            query.addToPipeline(anotherMockFilter);

            await query.execute();

            expect(mockFilter).toHaveBeenCalled();
            expect(anotherMockFilter).toHaveBeenCalled();
        });

        describe('When data is an array of results', () => {
            it('Adds a new filter to the pipeline to clear the filtering information and to map data to models', async () => {
                const database = new Database([MockModel.tableName]);
                database.write({
                    mock_table_1: [
                        { id: 1 },
                        { id: 2 },
                        { id: 3 },
                        { id: 4 }
                    ]
                })

                const query = new DatabaseQuery(MockModel, database);
                const filter = jest.fn().mockImplementation((data) => {
                    return data.filter(entry => {
                        entry.__filterMatches = [[]]

                        return entry.id >= 2;
                    });
                });
                query.addToPipeline(filter);

                const result = await query.execute();
                expect(query.pipeline).toHaveLength(2);
                expect(filter).toHaveBeenCalled();
                expect(result).toHaveLength(3);
                result.forEach((entry) => {
                    expect(entry).toBeInstanceOf(MockModel);
                    expect(entry.__filterMatches).toBeUndefined();
                });
            });

        });

        describe('When data is a single entry object', () => {
            it('Returns the data mapped to the Model', async () => {
                const database = new Database([MockModel.tableName]);
                database.write({
                    mock_table_1: [
                        { id: 1 },
                        { id: 2 },
                        { id: 3 },
                        { id: 4 }
                    ]
                });

                const query = new DatabaseQuery(MockModel, database);
                const filter = jest.fn().mockImplementation((data) => {
                    return data.find(entry => entry.id === 2);
                });

                query.addToPipeline(filter);
                const result = await query.execute();
                expect(query.pipeline).toHaveLength(2);
                expect(result).toBeInstanceOf(MockModel);
            });
        });

        describe('When data is not found because of pipeline requirements', () => {
            it('Returns undefined', async () => {
                const database = new Database([MockModel.tableName]);
                database.write({
                    mock_table_1: [
                        { id: 1 },
                        { id: 2 },
                        { id: 3 },
                        { id: 4 }
                    ]
                });

                const query = new DatabaseQuery(MockModel, database);
                const filter = jest.fn().mockImplementation((data) => {
                    return data.find(entry => entry.id < 0);
                });

                query.addToPipeline(filter);
                const result = await query.execute();
                expect(query.pipeline).toHaveLength(2);
                expect(result).toBeUndefined();
            });
        });
    });

    describe('.find() method', () => {
        it('calls the execute method', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                [MockModel.tableName]: [
                    { id: 1 },
                    { id: 2 },
                    { id: 3 },
                    { id: 4 }
                ]
            });

            const query = new DatabaseQuery(MockModel, database);
            jest.spyOn(query, 'execute');
            await query.find(2);

            expect(query.execute).toHaveBeenCalled();
        });

        it('returns an entry which matches the queried primary key', async () => {
            class MockUser extends MockModel {
                static tableName = 'mock_users';
                static primaryKey = 'user_id';
            }

            const database = new Database([MockUser.tableName]);
            database.write({
                [MockUser.tableName]: [
                    { user_id: 1, name: 'George' },
                    { user_id: 15, name: 'Ben' },
                    { user_id: 16, name: 'Jean' },
                    { user_id: 19, name: 'Geoff' }
                ]
            });

            const query = new DatabaseQuery(MockUser, database);
            const response = await query.find(16);

            expect(response).toBeInstanceOf(MockUser);
            expect(response.user_id).toEqual(16);
            expect(response.name).toEqual('Jean');
        });

        it('returns undefined if there is no match', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                [MockModel.tableName]: [
                    { id: 1 }
                ]
            });

            const query = new DatabaseQuery(MockModel, database);
            const result = await query.find(2);

            expect(result).toBeUndefined();
        });
    });

    describe('.random() method', () => {
        it('calls the execute method', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                [MockModel.tableName]: [
                    { id: 1 },
                    { id: 2 },
                    { id: 3 },
                    { id: 4 }
                ]
            });

            const query = new DatabaseQuery(MockModel, database);
            jest.spyOn(query, 'execute');
            await query.random();

            expect(query.execute).toHaveBeenCalled();
        });

        it('returns a random entry from the database', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                [MockModel.tableName]: [
                    { id: 1 },
                    { id: 2 },
                    { id: 3 },
                    { id: 4 }
                ]
            });

            const query = new DatabaseQuery(MockModel, database);
            const result = await query.random();

            expect(database.content[MockModel.tableName]).toContainEqual(result);
        });
    });

    describe('.all() method', () => {
        it('calls the execute method', async () => {
            const database = new Database([MockModel.tableName]);
            const query = new DatabaseQuery(MockModel, database);
            jest.spyOn(query, 'execute');
            await query.all();

            expect(query.execute).toHaveBeenCalled();
        });

        it('returns all queried entries', async () => {
            const database = new Database([MockModel.tableName]);
            database.write({
                [MockModel.tableName]: [
                    { id: 1 },
                    { id: 2 },
                    { id: 3 },
                    { id: 4 }
                ]
            });

            const query = new DatabaseQuery(MockModel, database);
            const result = await query.all();

            expect(result).toHaveLength(4);
        });
    });

    describe('.where() method', () => {
        it('Returns itself', () => {
            const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
            expect(query.where('id', 1)).toBe(query);
        });

        it('Throws an error if 1 argument is passed', () => {
            const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
            expect(() => query.where('id')).toThrow();
        });

        it('Throws an error if more than 3 arguments are passed', () => {
            const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
            expect(() => query.where('id', DatabaseQuery.DB_FILTER_TYPE_BETWEEN, [1, 3], () => { })).toThrow();
        });

        describe('When 2 arguments are passed', () => {
            // class to be used in this case
            class MockCity extends Model {
                static tableName = 'cities';
            };

            describe('When second argument is a function', () => {
                it('Once executed, filters the results by a passed filtering function if it\'s passed as a second argument', async () => {
                    const database = new Database([MockCity.tableName]);
                    await database.write({
                        cities: [
                            { id: 1, name: 'Paris' },
                            { id: 2, name: 'Poznań' },
                            { id: 3, name: 'Portland' },
                            { id: 4, name: 'New York' },
                            { id: 5, name: 'Wrocław' }
                        ]
                    });
                    const query = new DatabaseQuery(MockCity, database);
                    const result = await query
                        .where('name', (name) => name.startsWith('P'))
                        .execute();

                    expect(result).toHaveLength(3);
                    result.forEach(entry => {
                        expect(entry.name.startsWith('P')).toBe(true);
                    });
                });
            });

            describe('When second argument is a value', () => {
                it('Once executed, filters the results by the passed value', async () => {
                    const database = new Database([MockCity.tableName]);
                    await database.write({
                        cities: [
                            { id: 1, name: 'Paris' },
                            { id: 2, name: 'Poznań' },
                            { id: 3, name: 'Portland' },
                            { id: 4, name: 'New York' },
                            { id: 5, name: 'Wrocław' }
                        ]
                    });
                    const query = new DatabaseQuery(MockCity, database);
                    const result = await query
                        .where('name', 'Portland')
                        .execute();

                    expect(result).toHaveLength(1);
                    expect(result[0]).toBeInstanceOf(MockCity);
                    expect(result[0].name).toEqual('Portland');
                });
            });
        });

        describe('When 3 arguments are passed', () => {
            it('Throws an error when the filter type is not recognized', () => {
                const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
                expect(() => query.where('id', 'between', [1, 3])).toThrow();
            });

            describe('When filterType is equal to DB_FILTER_TYPE_BETWEEN', () => {
                it('Throws an error if the third argument is not an array', () => {
                    const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
                    expect(() => query.where('id', DatabaseQuery.DB_FILTER_TYPE_BETWEEN, { min: 1, max: 3 })).toThrow();
                });

                it('Throws an error if the third argument isn\'t an array with exactly 2 entries', () => {
                    const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
                    expect(() => query.where('id', DatabaseQuery.DB_FILTER_TYPE_BETWEEN, [1])).toThrow();
                });

                it('Once executed, it returns only the data which has the queried value between min and max numerically', async () => {
                    class MockUser extends Model {
                        static tableName = 'mock_users';
                    };

                    const database = new Database([MockUser.tableName]);
                    await database.write({
                        mock_users: [
                            { id: 1, name: 'Carl', age: 19 },
                            { id: 2, name: 'Jonas', age: 22 },
                            { id: 3, name: 'Carrie', age: 14 },
                            { id: 4, name: 'Eve', age: 43 }
                        ]
                    });

                    const query = new DatabaseQuery(MockUser, database);
                    const result = await query
                        .where('age', DatabaseQuery.DB_FILTER_TYPE_BETWEEN, [18, 40])
                        .execute();

                    expect(result).toHaveLength(2);
                    expect(result[0].age).toEqual(19);
                    expect(result[1].age).toEqual(22);
                });

                it('Once executed, it returns only the data which has the queried value between min and max lexically', async () => {
                    class MockUser extends Model {
                        static tableName = 'mock_users';
                    };

                    const database = new Database([MockUser.tableName]);
                    await database.write({
                        mock_users: [
                            { id: 1, name: 'Carl', age: 19 },
                            { id: 2, name: 'Jonas', age: 22 },
                            { id: 3, name: 'Carrie', age: 14 },
                            { id: 4, name: 'Eve', age: 43 },
                            { id: 5, name: 'Victor', age: 29 }
                        ]
                    });

                    const query = new DatabaseQuery(MockUser, database);
                    const result = await query
                        .where('name', DatabaseQuery.DB_FILTER_TYPE_BETWEEN, ['E', 'T'])
                        .execute();

                    expect(result).toHaveLength(2);
                    expect(result[0].name).toEqual('Jonas');
                    expect(result[1].name).toEqual('Eve');
                });
            });

            describe('When filterType is equal to DB_FILTER_TYPE_IN', () => {
                it('Throws an error if the third argument is not an array', () => {
                    const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));
                    expect(() => query.where('id', DatabaseQuery.DB_FILTER_TYPE_IN, { param: 'searchedString' })).toThrow();
                });

                it('Once executed, if the key field is an Array, performs a case insensitive OR search on its values', async () => {
                    const database = new Database([MockModel.tableName]);
                    await database.write({
                        [MockModel.tableName]: [
                            { id: 1, hashtags: ['Throwback', 'GoodTimes', 'friends'] },
                            { id: 2, hashtags: ['throwback', 'Friends'] },
                            { id: 3, hashtags: ['throwback', 'partynight'] },
                            { id: 4, hashtags: ['goodday', 'coffee'] },
                            { id: 5, hashtags: ['night', 'party'] }
                        ]
                    });


                    const query = new DatabaseQuery(MockModel, database);

                    const result = await query
                        .where('hashtags', DatabaseQuery.DB_FILTER_TYPE_IN, ['throwback', 'friends'])
                        .execute();

                    expect(result).toHaveLength(3);
                });

                it('Once executed, if the field is not an array, returns the entries which are contained in the passed argument', async () => {
                    const database = new Database([MockModel.tableName]);
                    await database.write({
                        [MockModel.tableName]: [
                            { id: 1, title: 'ES6 Tutorial', language: 'JavaScript' },
                            { id: 2, title: 'ASP .NET', language: 'C#' },
                            { id: 3, title: 'React Native for Beginners', language: 'JavaScript' },
                            { id: 4, title: 'Machine Learning with Python', language: 'Python' },
                            { id: 5, title: 'Raspberry Pi IoT tutorial', language: 'Python' }
                        ]
                    });

                    const query = new DatabaseQuery(MockModel, database);

                    const result = await query
                        .where('language', DatabaseQuery.DB_FILTER_TYPE_IN, ['JavaScript', 'C#'])
                        .execute();

                    expect(result).toHaveLength(3);
                });
            });
        });
    });

    describe('.orderBy() method', () => {
        describe('If an invalid ordering type parameter is provided', () => {
            it('Throws an error', () => {
                const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));

                expect(() => query.orderBy('id', 'descending')).toThrow();
            });
        });

        describe('When the type argument is DESC', () => {
            it('Filters the results by the key argument, descending', async () => {
                class MockPerson extends Model {
                    static tableName = 'people';
                };

                const database = new Database([MockPerson.tableName]);
                await database.write({
                    people: [
                        {
                            name: 'Jean',
                            age: 18
                        },
                        {
                            name: 'Juliett',
                            age: 21
                        },
                        {
                            name: 'Robert',
                            age: 31
                        },
                        {
                            name: 'Gary',
                            age: 29
                        }
                    ]
                });

                const query = new DatabaseQuery(MockPerson, database);
                const result = await query
                    .orderBy('age', 'DESC')
                    .execute();

                expect(result).toHaveLength(4);
                expect(result.map(entry => entry.age)).toEqual([31, 29, 21, 18]);
            });


        });

        describe('When the type argument is ASC', () => {
            it('Filters the results by the key argument, ascending', async () => {
                class MockPerson extends Model {
                    static tableName = 'people';
                };

                const database = new Database([MockPerson.tableName]);
                await database.write({
                    people: [
                        {
                            name: 'Peter',
                            age: 48
                        },
                        {
                            name: 'Edward',
                            age: 26
                        },
                        {
                            name: 'Timothy',
                            age: 11
                        },
                        {
                            name: 'Gary',
                            age: 19
                        }
                    ]
                });

                const query = new DatabaseQuery(MockPerson, database);
                const result = await query
                    .orderBy('age', 'ASC')
                    .execute();

                expect(result).toHaveLength(4);
                expect(result.map(entry => entry.age)).toEqual([11, 19, 26, 48]);
            });
        });
    });

    describe('.orderByMatches() method', () => {
        describe('If an invalid ordering type parameter is provided', () => {
            it('Throws an error', () => {
                const query = new DatabaseQuery(MockModel, new Database([MockModel.tableName]));

                expect(() => query.orderByMatches(0, 'descending')).toThrow();
            });
        });

        describe('If run before a proper where() search which provides filterMatches, throws an error', () => {
            it('Throws an error', async () => {
                const database = new Database([MockModel.tableName]);
                await database.write({
                    [MockModel.tableName]: [
                        { id: 1, title: 'ES6 Tutorial', language: 'JavaScript' },
                        { id: 2, title: 'ASP .NET', language: 'C#' },
                    ]
                });

                const query = new DatabaseQuery(MockModel, database);
                expect(() => query.orderByMatches(0, 'DESC').execute()).rejects.toThrow();
            });
        });

        describe('If run after a proper where() search which provides filterMatches', () => {
            describe('If the type argument is DESC', () => {
                it('Sorts the results by the amount of matches descending', async () => {
                    const database = new Database([MockModel.tableName])
                    await database.write({
                        [MockModel.tableName]: [
                            { id: 1, hashtags: ['throwback', 'Friends'] },
                            { id: 2, hashtags: ['throwback', 'partynight'] },
                            { id: 3, hashtags: ['Throwback', 'GoodTimes', 'friends'] },
                        ]
                    });

                    const query = new DatabaseQuery(MockModel, database);
                    const result = await query
                        .where('hashtags', DatabaseQuery.DB_FILTER_TYPE_IN, ['throwback', 'goodtimes', 'friends'])
                        .orderByMatches(0, 'DESC')
                        .execute();

                    expect(result).toHaveLength(3);
                    expect(result[0].id).toEqual(3);
                    expect(result[1].id).toEqual(1);
                    expect(result[2].id).toEqual(2);
                });
            });

            describe('If the type argument is ASC', () => {
                it('Sorts the results by the amount of matches ascending', async () => {
                    const database = new Database([MockModel.tableName])
                    await database.write({
                        [MockModel.tableName]: [
                            { id: 1, hashtags: ['throwback', 'Friends'] },
                            { id: 2, hashtags: ['throwback', 'partynight'] },
                            { id: 3, hashtags: ['Throwback', 'GoodTimes', 'friends'] },
                        ]
                    });

                    const query = new DatabaseQuery(MockModel, database);
                    const result = await query
                        .where('hashtags', DatabaseQuery.DB_FILTER_TYPE_IN, ['throwback', 'goodtimes', 'friends'])
                        .orderByMatches(0, 'ASC')
                        .execute();

                    expect(result).toHaveLength(3);
                    expect(result[0].id).toEqual(2);
                    expect(result[1].id).toEqual(1);
                    expect(result[2].id).toEqual(3);
                });
            });
        });
    });

    describe('.save() method', () => {
        it('Calls the database.write() method', async () => {
            const database = new Database([MockModel.tableName]);
            jest.spyOn(database, 'write');

            const query = new DatabaseQuery(MockModel, database);
            const newObject = new MockModel({ name: 'MockModel' });

            await query.save(MockModel.tableName, newObject);

            expect(database.write).toHaveBeenCalled();
        });

        describe('If the new model has a primary key set', () => {
            it('It updates the existing record if it exists', async () => {
                class CustomMockModel extends MockModel {};
                const database = new Database([CustomMockModel.tableName]);
                CustomMockModel.database = database; // required for the Model to know which adapter to use

                await database.write({
                    [CustomMockModel.tableName]: [
                        { id: 1, name: 'Garrett', age: 22 },
                        { id: 2, name: 'Morgan', age: 29 }
                    ]
                });

                const query = new DatabaseQuery(CustomMockModel, database);
                const model = await query.find(1);

                model.age = 25;
                await model.save();

                expect(database.content[CustomMockModel.tableName]).toHaveLength(2);
                expect(database.content[CustomMockModel.tableName][0].age).toEqual(25);
            });
        });

        describe('If the new model does not have a primary key set', () => {
            it('Pushes the new entry into the database with a new primary key', async () => {
                class CustomMockModel extends MockModel {};
                const database = new Database([CustomMockModel.tableName]);
                CustomMockModel.database = database; // required for the Model to know which adapter to use

                await database.write({
                    [CustomMockModel.tableName]: [
                        { id: 1, name: 'Garrett', age: 22 },
                        { id: 2, name: 'Morgan', age: 29 }
                    ]
                });

                const model = new CustomMockModel({ name: 'Wiktor', age: 24 });
                await model.save();
                
                expect(database.content[CustomMockModel.tableName]).toHaveLength(3);
                expect(database.content[CustomMockModel.tableName][2].id).toEqual(3);
                expect(database.content[CustomMockModel.tableName][2].name).toEqual('Wiktor');
                expect(database.content[CustomMockModel.tableName][2].age).toEqual(24);

            });
        });
    });
});
