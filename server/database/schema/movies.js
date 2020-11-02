const schema = (model) => ({
    genres: {
        isArray: { 
            options: {
                min: 1 
            }
        },
        custom: {
            options: async (value) => {
                const genres = await model.genres().all();
                const nonExistentGenre = value.find(genre => !genres.map(String).includes(genre));

                if (nonExistentGenre) throw new Error(`${nonExistentGenre} genre is not recognized`);
            }
        }
    },

    title: {
        isString: true,
        isLength: {
            options: {
                min: 1,
                max: 255
            }
        }
    },

    director: {
        isString: true,
        isLength: {
            options: {
                min: 1,
                max: 255
            }
        }
    },

    year: {
        isInt: {
            options: {
                min: 1888
            }
        },
        toInt: true
    },

    runtime: {
        isInt: {
            options: {
                min: 0
            }
        },
        toInt: true
    },

    actors: {
        isString: true,
        optional: true
    },

    plot: {
        isString: true,
        optional: true
    },

    posterUrl: {
        isString: true,
        optional: true
    },
});


module.exports = schema;