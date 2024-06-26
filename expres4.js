const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { MongoClient } = require("mongodb");
const app = express();
const port = 3000;

// MongoDB Connection URI
const uri = "mongodb+srv://UserNew:NewUser228@divail.myqfgb2.mongodb.net/?retryWrites=true&w=majority&appName=Divail";

// Initialize MongoClient
const client = new MongoClient(uri);

// Connect to MongoDB
client.connect(err => {
  if (err) {
      console.error('Error connecting to MongoDB:', err);
      return;
  }
  console.log('Connected to MongoDB');
});

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Use cookie-parser middleware
app.use(cookieParser());

// Default endpoint
app.get('/', (req, res) => {
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
    console.log("Received login request:", { UserName, Password }); // Log the received data
    const usersCollection = client.db('ckmdb').collection('User');

    // Check if the user exists in the database
    const user = await usersCollection.findOne({ UserName, Password });

    if (user) {
        // Generate authentication cookie and set userId cookie
        res.cookie('auth', 'authenticated', { maxAge: 60000 }); // Expiring in 1 minute
        res.cookie('userId', user.userId, { maxAge: 60000 }); // Assuming user has a field userId
        console.log("Login successful:", { UserName, Password }); // Log successful login
        res.redirect('/topics'); // Redirect to the topics page upon successful login
    } else {
        console.log("Invalid login attempt:", { UserName, Password }); // Log invalid login attempt
        res.send('Invalid UserName or Password. <a href="/">Go back</a>');
    }
});

// Register endpoint
app.post('/register', async (req, res) => {
    const { UserName, Password } = req.body;
    console.log("Received registration request:", { UserName, Password }); // Log the received data
    const usersCollection = client.db('ckmdb').collection('User');

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
});

// Route to display topics/message threads
app.get('/topics', async (req, res) => {
    // Retrieve all topics from the database
    const topicsCollection = client.db('ckmdb').collection('Topics');
    const topics = await topicsCollection.find({}).toArray();

    // Render the topics page with the retrieved topics
    let topicsList = '<h2>Message Threads</h2><ul>';
    topics.forEach(topic => {
        topicsList += `<li><a href="/topic/${topic._id}">${topic.name}</a></li>`;
    });
    topicsList += '</ul>';
    topicsList += '<button onclick="location.href=\'/add-topic\'">Add New Topic</button>'; // Button to add a new topic
    topicsList += '<br><a href="/">Logout</a>';
    res.send(topicsList);
});

// Route to handle adding a new topic
app.post('/add-topic', async (req, res) => {
    const { topicName } = req.body;
    // Logic to add the new topic to the database
    const topicsCollection = client.db('ckmdb').collection('Topics');
    await topicsCollection.insertOne({ name: topicName }); // Insert the new topic into the database

    // Redirect to the topics page after adding a new topic
    res.redirect('/topics');
});

// Route to display a form for adding a new topic
app.get('/add-topic', (req, res) => {
    // Render a form for adding a new topic
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

// Route to display a specific topic/message thread
app.get('/topic/:topicId', async (req, res) => {
    const { topicId } = req.params;

    try {
        // Fetch messages for the specified topicId
        const messagesCollection = client.db('ckmdb').collection('Messages');
        const messages = await messagesCollection.find({ topicId }).toArray();

        // Find the topic name from the database
        const topicsCollection = client.db('ckmdb').collection('Topics');
        const topic = await topicsCollection.findOne({ id: topicId });
        const topicName = topic ? topic.name : 'Unknown Topic';

        // Render the topic page with messages
        let topicPage = `<h2>Topic: ${topicName}</h2>`;
        topicPage += `<h3>Messages:</h3>`;
        if (messages.length > 0) {
            for (const message of messages) {
                topicPage += `<p>${message.message}</p>`;
            }
        } else {
            topicPage += `<p>No messages for this topic.</p>`;
        }

        // Add a form to post new messages
        topicPage += `
            <form action="/post-message" method="post">
                <input type="hidden" name="topicId" value="${topicId}">
                <input type="text" name="message" placeholder="Enter your message">
                <button type="submit">Post Message</button>
            </form>
        `;

        res.send(topicPage);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Route to handle sending a message to a specific topic
app.post('/post-message', async (req, res) => {
    const { topicId } = req.body; 
    const { message } = req.body;
    const userId = req.cookies.userId;

    // Logic to save the message to the database
    const messagesCollection = client.db('ckmdb').collection('Messages');
    await messagesCollection.insertOne({ topicId, userId, message });

    res.redirect(`/topic/${topicId}`);
});

// Start server
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
