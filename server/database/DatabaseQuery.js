const DB = require('./index');

class DatabaseQuery {
    // filtering types for database queries
    static DB_FILTER_TYPE_BETWEEN = Symbol('between');
    static DB_FILTER_TYPE_IN = Symbol('in');

    model = null; // model class which we're querying against
    data = []; // data loaded from the database
    pipeline = []; // array of functions to run to filter the query

    database = null;

    constructor(model, database = DB) {
        this.model = model;
        this.database = database;
    }

    /**
     * Loads the database content
     * 
     * @returns {Promise<object>}
     */
    loadDatabase() {
        return this.database.read();
    }

    /**
     * Loads the table contents from the database
     * 
     * @returns {Promise<Array>}
     */
    async loadData() {
        // for this simple file-based case, 
        // let's load the file dynamically into the memory and work from it
        const dbContent = await this.loadDatabase();

        this.data = JSON.parse(JSON.stringify(dbContent[this.model.tableName]));

        return this.data;
    }

    /**
     * Executes the query based on the provided filters in the pipeline
     * 
     * @returns {Promise< Array<Model> | Model | undefined>}
     */
    async execute() {
        await this.loadData();

        this.pipeline.push((data) => {
            let finalData; 
            if (data instanceof Array) {
                finalData = data.map(entry => {
                    delete entry.__filterMatches;

                    return new (this.model)(entry);
                });
            } else if (data) {
                finalData = new (this.model)(data);
            }

            return finalData;
        });

        this.pipeline.forEach(handler => {
            this.data = handler(this.data);
        });

        return this.data;
    }

    /**
     * Adds a filtering handler to the query pipeline
     * 
     * @param {Function} handler 
     */
    addToPipeline(handler) {
        this.pipeline.push(handler);
    }

    /**
     * Finds the first entry which matches the primary key value
     *
     * @param {*} primaryKeyValue 
     * @returns {Promise<Model | undefined>}
     */
    find(primaryKeyValue) {
        this.addToPipeline((data) => {
            return data.find(entry => entry[this.model.primaryKey] === primaryKeyValue);
        });

        return this.execute();
    }

    /**
     * Returns a random entry from the queried items
     * 
     * @returns {Promise<Model | undefined>}
     */
    random() {
        this.addToPipeline(data => {
            if (!(data instanceof Array)) {
                throw new Error('random() must be run on an array of data');
            }

            const random = Math.floor(Math.random() * data.length);

            return data[random];
        });

        return this.execute();
    }
    
    /**
     * Returns all of the queried items (same as .execute())
     * 
     * @returns {Promise<Array<Model>>}
     */
    all() {
        return this.execute();
    }

    /**
     * Adds a filter to the pipeline which queries for specified values
     * First argument is always the key.
     * If two arguments are passed, the second argument can either be a function which will be passed to the filter() handler or a value which will be checked against that field in the model
     * If three arguments are passed, the second argument becomes an advanced filter (one of the static properties on DatabaseQuery) and the third one becomes its options object
     * 
     * @param {string} key - key on the object that we want to filter by
 
     * @returns {DatabaseQuery}
     */
    where() {
        if (arguments.length < 2 || arguments.length > 3) {
            throw new Error('Invalid number of arguments passed to .where()');
        }

        const key = arguments[0];

        if (arguments.length === 2) {
            if (typeof arguments[1] === 'function') {
                this.addToPipeline((data) => data.filter((entry) => arguments[1](entry[key])));
                return this;
            }

            const value = arguments[1];
            this.addToPipeline((data) => data.filter(entry => entry[key] === value));
            return this;
        }

        // type of filter, see static properties of this class for reference
        const filterType = arguments[1];
        // value for filtering
        const value = arguments[2];

        // handle the logic differently based on the filterType
        switch(filterType) { 
            case DatabaseQuery.DB_FILTER_TYPE_BETWEEN: {
                // third parameter must be [min,max]
                if (!(value instanceof Array)) {
                    throw new Error('Invalid arguments passed to .where()');
                }
                
                // check if the format of the tuple is right
                if (value.length !== 2) {
                    throw new Error('Invalid arguments passed to .where()');
                }
                
                // read the values
                const [min, max] = value;

                // filter based on the min and max values
                this.addToPipeline(data => {
                    return data.filter(entry => {
                        const value = entry[key];

                        return value >= min && value <= max;
                    });
                });

                break;
            }

            case DatabaseQuery.DB_FILTER_TYPE_IN: {
                if (!(value instanceof Array)) {
                    throw new Error('Invalid arguments passed to .where()');
                }

                this.addToPipeline(data => data.filter(entry => {
                    const keyValue = entry[key];

                    if (keyValue instanceof Array) {
                        const filteredElements = keyValue.filter(elem => {
                            if (typeof elem === 'string') {
                                return value.map(v => v.toLowerCase()).includes(elem.toLowerCase());
                            }

                            return value.includes(elem)
                        });

                        if (filteredElements.length === 0) {
                            return false;
                        }

                        entry.__filterMatches = entry.__filterMatches || [];
                        entry.__filterMatches.push(filteredElements);

                        return true;
                    }

                    return value.includes(keyValue);
                }));

                break;
            }

            default: {
                throw new Error('Unsupported Database filter type');
            }
        }

        return this;
    }

    /**
     * Orders results by a key, either descending or ascending
     * 
     * @param {string} key 
     * @param {'ASC' | 'DESC'} type
     */
    orderBy(key, type = 'DESC') {
        if (!['DESC', 'ASC'].includes(type)) {
            throw new Error('orderBy can be ordered with DESC and ASC type only');
        }

        this.addToPipeline((data) => {
            return data.sort((a,b) => {
                const aValue = a[key];
                const bValue = b[key];

                if (aValue > bValue) {
                    return (type === 'DESC' ? -1 : 1);
                }

                if (bValue > aValue) { 
                    return (type === 'DESC' ? 1 : -1);
                }

                return 0;
            });
        });

        return this;
    }

    /**
     * Orders the values by the number of matches in a where() search result
     * 
     * @param {Number} filterIndex 
     * @param {'ASC' | 'DESC'} type 
     */
    orderByMatches(filterIndex, type = 'DESC') {
        if (!['DESC', 'ASC'].includes(type)) {
            throw new Error('orderByMatches can be ordered with DESC and ASC type only');
        }

        this.addToPipeline((data) => {
            return data.sort((a, b) => {
                const aMatches = a.__filterMatches[filterIndex];

                if (aMatches === undefined) {
                    throw new Error('orderByMatches() must be run after a supported filtering method');
                }

                const bMatches = b.__filterMatches[filterIndex];

                if (aMatches.length > bMatches.length) {
                    return (type === 'DESC' ? -1 : 1);
                }

                if (aMatches.length < bMatches.length) {
                    return (type === 'DESC' ? 1 : -1);
                }

                return 0;
            });
        });

        return this;
    } 

    /**
     * Saves a model in the database
     * 
     * @param {String} tableName 
     * @param {Model} data 
     */
    async save(tableName, data) {
        const databaseContent = await this.loadDatabase();
        const tableContent = databaseContent[tableName];

        let primaryKeyValue = data[this.model.primaryKey];

        // handle updates to the model
        if (primaryKeyValue) {
            const existingEntryIndex = tableContent.findIndex(entry => entry[this.model.primaryKey] === primaryKeyValue);

            if (existingEntryIndex !== -1) {
                tableContent[existingEntryIndex] = {...tableContent[existingEntryIndex], ...data};
            }
        } else {
            // handle new entry being created
            // for simplicity let's assume that primary key is always an auto incrementing number
            const lastElement = tableContent[tableContent.length - 1];
            const lastElementId = lastElement ? lastElement[this.model.primaryKey] : 0;

            data[this.model.primaryKey] = lastElementId + 1;

            tableContent.push(data);
        }

        // execute the update on the database
        await this.database.write(databaseContent);

        return data;
    }
}

module.exports = DatabaseQuery;
