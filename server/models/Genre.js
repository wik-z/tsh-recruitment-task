const SimpleModel = require("./SimpleModel");

class Genre extends SimpleModel {
    static tableName = 'genres';

    valueOf() {
        return this.value;
    }
}

module.exports = Genre;