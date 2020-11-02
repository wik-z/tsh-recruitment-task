const DatabaseQuery = require("../database/DatabaseQuery");
const validateSchema = require("../database/schema/validateSchema");

class Model {
    static tableName = '';
    static primaryKey = 'id';
    static schema = null;

    static database = undefined; // use default

    static query() {
        return new DatabaseQuery(this, this.database);
    }

    constructor(data) {
        // it's an abstract class so throw an error
        if (this.constructor === Model) {
            throw new Error('Model is an abstract class and cannot be instantiated directly');
        }

        if (data) {
            const keys = Object.keys(data);
            keys.forEach(key => {
                this[key] = data[key];
            });
        }
    }

    async load() {
        const self = this.constructor;
        
        const result = await self.query().find(this[self.primaryKey]);

        if (result) {
            const keys = Object.keys(result);

            keys.forEach(key => this[key] = result[key]);
        }
    }

    async save() {
        await this.validate();
        
        await this.constructor.query()
            .save(this.constructor.tableName, this);
    }

    validate() {
        return validateSchema(this.constructor.schema, this);
    }
}

module.exports = Model;