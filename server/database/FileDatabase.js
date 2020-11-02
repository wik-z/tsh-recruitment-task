const path = require('path');
const fs = require('fs');

class FileDatabase {
    filename = '';

    constructor(file = path.resolve(__dirname + '../../../data/db.json')) {
        this.filename = file;
    }

    read() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filename, (err, data) => {
                if (err) {
                    return reject(err);
                }

                try {
                    resolve(JSON.parse(data.toString()));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    write(content) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.filename, JSON.stringify(content, undefined, '    '), (err) => {
                if (err) reject(err);

                resolve();
            });
        }) 
    }
}

module.exports = FileDatabase;