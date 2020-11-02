class Database {
    constructor(tables) {
        this.content = {};

        for (const table of tables) {
            this.content[table] = [];
        }
    }

    async read() {
        return this.content;
    }

    async write(data) {
        this.content = data;
    }
}

module.exports = Database;