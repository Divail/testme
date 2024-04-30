const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { Database, User, Topic, Message } = require('./model');

const app = express();
const port = 3000;

// MongoDB Connection URI
const uri = "mongodb+srv://UserNew:NewUser228@divail.myqfgb2.mongodb.net/?retryWrites=true&w=majority&appName=Divail";

// Initialize database
const db = new Database(uri);

// Use middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Default endpoint
app.get('/', async (req, res) => {
    // Check for authentication cookie
    if (req.cookies.auth) {
        // Authentication cookie exists
        res.send(`Authentication cookie exists. Value: ${req.cookies.auth}<br><a href="/cookies">View active cookies</a>`);
    } else {
        // Authentication cookie does not exist
        res.send(`
            <h2>Login or Register</h2>
            <form action="/login" method="post">
                <label for="UserName">User Name:</label><br>
                <input type="text" id="UserName" name="UserName" required><br>
                <label for="Password">Password:</label><br>
                <input type="password" id="Password" name="Password" required><br><br>
                <input type="submit" value="Login">
            </form>
            <br>
            <form action="/register" method="post">
                <label for="UserName">Desired User Name:</label><br>
                <input type="text" id="UserName" name="UserName" required><br>
                <label for="Password">Desired Password:</label><br>
                <input type="password" id="Password" name="Password" required><br><br>
                <input type="submit" value="Register">
            </form>
        `);
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { UserName, Password } = req.body;
    const user = new User(db.getClient());

    try {
        // Check if the user exists in the database
        const foundUser = await user.findOne({ UserName, Password });

        if (foundUser) {
            // Generate authentication cookie and set userId cookie
            res.cookie('auth', 'authenticated', { maxAge: 60000 }); // Expiring in 1 minute
            res.cookie('userId', foundUser.userId, { maxAge: 60000 }); // Assuming user has a field userId
            console.log("Login successful:", { UserName, Password }); // Log successful login
            res.redirect('/topics'); // Redirect to the topics page upon successful login
        } else {
            console.log("Invalid login attempt:", { UserName, Password }); // Log invalid login attempt
            res.send('Invalid UserName or Password. <a href="/">Go back</a>');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Register endpoint
app.post('/register', async (req, res) => {
    const { UserName, Password } = req.body;
    const user = new User(db.getClient());

    try {
        // Check if the user already exists in the database
        const existingUser = await user.findOne({ UserName });

        if (existingUser) {
            res.send('Registration failed. User already exists. <a href="/">Go back</a>');
        } else {
            // If the user does not exist, insert the new user into the database
            await user.insertOne({ UserName, Password });
            console.log("User registered successfully:", { UserName, Password }); // Log successful registration
            res.send('Registration successful!<br><a href="/">Go back to login</a>');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display topics/message threads
app.get('/topics', async (req, res) => {
    const topic = new Topic(db.getClient());
    const topicsList = await topic.find({});
    
    // Render the topics page with the retrieved topics
    res.send(`
        <h2>Message Threads</h2>
        <ul>
            ${topicsList.map(topic => `<li><a href="/topic/${topic._id}">${topic.name}</a></li>`).join('')}
        </ul>
        <button onclick="location.href='/add-topic'">Add New Topic</button>
        <br>
        <a href="/">Logout</a>
    `);
});

// Route to handle adding a new topic
app.post('/add-topic', async (req, res) => {
    const { topicName } = req.body;
    const topic = new Topic(db.getClient());

    try {
        // Logic to add the new topic to the database
        await topic.insertOne({ name: topicName });
        res.redirect('/topics'); // Redirect to the topics page after adding a new topic
    } catch (error) {
        console.error('Error adding new topic:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display a form for adding a new topic
app.get('/add-topic', (req, res) => {
    res.send(`
        <h2>Add New Topic</h2>
        <form action="/add-topic" method="post">
            <label for="topicName">Topic Name:</label><br>
            <input type="text" id="topicName" name="topicName" required><br><br>
            <input type="submit" value="Add Topic">
        </form>
        <br><a href="/topics">Back to Topics</a>
    `);
});

// Start server
db.connect()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server started at http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error starting server:', err);
    });
