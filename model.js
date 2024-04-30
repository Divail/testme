const { MongoClient } = require("mongodb");

class Database {
    constructor(uri) {
        if (Database.instance) {
            return Database.instance;
        }
        this.client = new MongoClient(uri);
        Database.instance = this;
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('Error connecting to MongoDB:', err);
        }
    }

    getClient() {
        return this.client;
    }
}

class User {
    constructor(db) {
        this.collection = db.collection('User');
    }

    async findOne(query) {
        return await this.collection.findOne(query);
    }

    async insertOne(data) {
        await this.collection.insertOne(data);
    }
}

class Topic {
    constructor(db) {
        this.collection = db.collection('Topics');
    }

    async find(query) {
        return await this.collection.find(query).toArray();
    }

    async findOne(query) {
        return await this.collection.findOne(query);
    }

    async insertOne(data) {
        await this.collection.insertOne(data);
    }
}

class Message {
    constructor(db) {
        this.collection = db.collection('Messages');
    }

    async find(query) {
        return await this.collection.find(query).toArray();
    }

    async insertOne(data) {
        await this.collection.insertOne(data);
    }
}

module.exports = { Database, User, Topic, Message };