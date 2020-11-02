const express = require('express');
const bodyParser = require('body-parser');
const router = require('./router');

const app = express();
const port = process.env.PORT || 3000;

// body parser
app.use(bodyParser.json());
// api routes
app.use('/api', router);

// main error handler
app.use((error, req, res, next) => {
    if (error) {
        // simple error logging to the console
        console.log(error);
        return res.status(500).json({ error: error.message })
    }

    next();
});

// if the user got that far and none of the above matched,
// it's most likely a 404
app.use((req, res) => {
    return res.sendStatus(404);
});

app.listen(port, () => {
    console.log(`Listening on localhost:${port}`)
});