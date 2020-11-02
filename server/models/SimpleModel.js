const Model = require("./Model");

class SimpleModel extends Model {
    static primaryKey = null;

    constructor(value) {
        super(undefined);

        if (this.constructor === SimpleModel) {
            throw new Error('SimpleModel is an abstract class and cannot be instantiated directly');
        }

        this.value = value;
    }

    toString() {
        return this.value;
    }

    valueOf() {
        return this.value;
    }
}

module.exports = SimpleModel;