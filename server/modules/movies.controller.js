const Movie = require("../models/Movie");
const { DB_FILTER_TYPE_IN, DB_FILTER_TYPE_BETWEEN } = require('../database/DatabaseQuery');


async function addMovie(req, res) {
    const movie = new Movie({
        title,
        runtime,
        year,
        actors,
        director,
        plot,
        posterUrl
    } = req.body);

    await movie.save();

    return res.status(201).json(movie);
}

async function getMovies(req, res) {
    const { duration, genres } = req.query;

    if (!duration && !genres) {
        const result = await Movie.query().random();

        return res.json(result);
    }

    if (genres && !duration) {
        const result = await Movie.query()
            .where('genres', DB_FILTER_TYPE_IN, genres)
            .orderByMatches(0, 'DESC')
            .execute();

        return res.json(result);
    }

    if (duration && !genres) {
        const result = await Movie.query()
            .where('runtime', DB_FILTER_TYPE_BETWEEN, [duration - 10, duration + 10])
            .random();

        return res.json(result);
    }

    if (genres && duration) {
        const result = await Movie.query()
            .where('genres', DB_FILTER_TYPE_IN, genres)
            .where('runtime', DB_FILTER_TYPE_BETWEEN, [duration - 10, duration + 10])
            .orderByMatches(0, 'DESC')
            .execute();

        return res.json(result);
    }
}

module.exports = {
    addMovie,
    getMovies
}