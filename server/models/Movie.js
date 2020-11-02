const Model = require("./Model");
const Genre = require("./Genre");
const schema = require("../database/schema/movies");

class Movie extends Model {
    static tableName = 'movies';
    static schema = schema(this);

    static genres() {
        return Genre.query();
    }
}


module.exports = Movie;