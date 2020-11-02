const express = require('express');
const router = express.Router();
const moviesRouter = require('./modules/movies.routes');

// health check path
router.get('/health-check', (req, res) => res.sendStatus(200));

// /movies module
router.use('/movies', moviesRouter);

module.exports = router;
