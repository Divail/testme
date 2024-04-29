const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { MongoClient } = require("mongodb");
const app = express();
const port = 3000;

// MongoDB Connection URI
const uri = "mongodb+srv://UserNew:NewUser228@divail.myqfgb2.mongodb.net/?retryWrites=true&w=majority&appName=Divail";

// Singleton Database Connection
class Database {
    constructor() {
        this.client = new MongoClient(uri);
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

const db = new Database();

// Observer pattern for topic subscriptions
class Topic {
    constructor(name) {
        this.name = name;
        this.subscribers = [];
        this.messages = [];
    }

    subscribe(user) {
        this.subscribers.push(user);
    }

    unsubscribe(user) {
        this.subscribers = this.subscribers.filter(subscriber => subscriber !== user);
    }

    postMessage(message) {
        this.messages.push(message);
        this.notify(message);
    }

    notify(message) {
        this.subscribers.forEach(subscriber => {
            subscriber.notify(message);
        });
    }

    getRecentMessages(count = 2) {
        return this.messages.slice(-count);
    }
}

// Model - User
class User {
    constructor(UserName, Password) {
        this.UserName = UserName;
        this.Password = Password;
        this.subscriptions = [];
    }

    subscribeToTopic(topic) {
        this.subscriptions.push(topic);
        topic.subscribe(this);
    }

    unsubscribeFromTopic(topic) {
        this.subscriptions = this.subscriptions.filter(subscription => subscription !== topic);
        topic.unsubscribe(this);
    }

    notify(message) {
        console.log(`Received message: ${message} as ${this.UserName}`);
        // Implement what should happen when a user receives a message
    }
}

// Controller - TopicController
class TopicController {
    constructor() {
        this.topics = [];
    }

    createTopic(topicName) {
        const newTopic = new Topic(topicName);
        this.topics.push(newTopic);
        return newTopic;
    }

    getAllTopics() {
        return this.topics;
    }

    getSubscribedTopics(user) {
        return user.subscriptions;
    }
}

// Controller - UserController
class UserController {
    async register(req, res) {
        const { UserName, Password } = req.body;
        console.log("Received registration request:", { UserName, Password }); // Log the received data
        const usersCollection = db.getClient().db('ckmdb').collection('User');

        // Check if the user already exists in the database
        const existingUser = await usersCollection.findOne({ UserName });

        if (existingUser) {
            // If the user already exists, send a message indicating registration is not possible
            res.send('Registration failed. User already exists. <a href="/">Go back</a>');
        } else {
            // If the user does not exist, insert the new user into the database
            await usersCollection.insertOne({ UserName, Password });
            console.log("User registered successfully:", { UserName, Password }); // Log successful registration
            res.send('Registration successful!<br><a href="/">Go back to login</a>');
        }
    }

    async login(req, res) {
        const { UserName, Password } = req.body;
        console.log("Received login request:", { UserName, Password }); // Log the received data
        const usersCollection = db.getClient().db('ckmdb').collection('User');

        // Check if the user exists in the database
        const user = await usersCollection.findOne({ UserName, Password });

        if (user) {
            // Generate authentication cookie
            res.cookie('auth', user.UserName, { maxAge: 60000 }); // Expiring in 1 minute
            console.log("Login successful:", { UserName, Password }); // Log successful login
            res.redirect('/');
        } else {
            console.log("Invalid login attempt:", { UserName, Password }); // Log invalid login attempt
            res.send('Invalid UserName or Password. <a href="/">Go back</a>');
        }
    }
}

const topicController = new TopicController();

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Use cookie-parser middleware
app.use(cookieParser());

// Default endpoint
app.get('/', async (req, res) => {
    // Check for authentication cookie
    if (req.cookies.auth) {
        // Authentication cookie exists
        const topics = topicController.getAllTopics();
        const user = await getUserFromDatabase(req); // get the user from the database
        const subscribedTopics = topicController.getSubscribedTopics(user);
        res.send(`
            <h2>Welcome ${user.UserName}!</h2>
            <h3>Subscribed Topics:</h3>
            <ul>
                ${subscribedTopics.map(topic => `<li>${topic.name} <a href="/unsubscribe/${topic.name}">(Unsubscribe)</a></li>`).join('')}
            </ul>
            <h3>All Topics:</h3>
            <ul>
                ${topics.map(topic => `<li>${topic.name} <a href="/subscribe/${topic.name}">(Subscribe)</a></li>`).join('')}
            </ul>
        `);
    } else {
        // Authentication cookie does not exist
        res.send(`
            <h2>Login or Register</h2>
            <form action="/login" method="post">
                <label for="loginUserName">Username:</label><br>
                <input type="text" id="loginUserName" name="UserName" required><br>
                <label for="loginPassword">Password:</label><br>
                <input type="password" id="loginPassword" name="Password" required><br><br>
                <input type="submit" value="Login">
            </form>
            <br>
            <form action="/register" method="post">
                <label for="registerUserName">Desired Username:</label><br>
                <input type="text" id="registerUserName" name="UserName" required><br>
                <label for="registerPassword">Desired Password:</label><br>
                <input type="password" id="registerPassword" name="Password" required><br><br>
                <input type="submit" value="Register">
            </form>
        `);
    }
});

// Handle login POST request
app.post('/login', async (req, res) => {
    const userController = new UserController();
    await userController.login(req, res);
});

// Handle registration POST request
app.post('/register', async (req, res) => {
    const userController = new UserController();
    await userController.register(req, res);
});

// Subscribe endpoint
app.get('/subscribe/:topicName', (req, res) => {
    const { topicName } = req.params;
    const user = getUserFromDatabase(req); // get the user from the database
    const topic = topicController.getAllTopics().find(topic => topic.name === topicName);
    if (topic) {
        user.subscribeToTopic(topic);
        res.redirect('/');
    } else {
        res.status(404).send('Topic not found.');
    }
});

// Unsubscribe endpoint
app.get('/unsubscribe/:topicName', (req, res) => {
    const { topicName } = req.params;
    const user = getUserFromDatabase(req); // get the user from the database
    const topic = user.subscriptions.find(topic => topic.name === topicName);
    if (topic) {
        user.unsubscribeFromTopic(topic);
        res.redirect('/');
    } else {
        res.status(404).send('Topic not found in subscriptions.');
    }
});

// Start server
app.listen(port, async () => {
    await db.connect();
    console.log(`Server started at http://localhost:${port}`);
});

async function getUserFromDatabase(req) {
    const usersCollection = db.getClient().db('ckmdb').collection('User');
    
    try {
        // Retrieve user based on authentication cookie
        const user = await usersCollection.findOne({ UserName: req.cookies.auth });
        return user;
    } catch (error) {
        console.error('Error retrieving user from database:', error);
        return null; // Return null or handle the error as appropriate in your application
    }
}
