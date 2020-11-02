const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { query, checkSchema } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const Movie = require('../models/Movie');
const moviesController = require('./movies.controller');

router.get('/', validationMiddleware([
    query('duration').optional().isInt({ min: 1 }).toInt(),
    query('genres').optional()
        .isArray({ min: 1 })
        .customSanitizer((value) => value.map(genre => genre[0].toUpperCase() + genre.substring(1, genre.length).toLowerCase()))
        .custom(Movie.schema.genres.custom.options)
        .toArray()
]), asyncHandler(moviesController.getMovies));


router.post('/',  asyncHandler(moviesController.addMovie));

module.exports = router;