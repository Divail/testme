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
                <label for="user_id">User ID:</label><br>
                <input type="text" id="user_id" name="user_id" required><br>
                <label for="password">Password:</label><br>
                <input type="password" id="password" name="password" required><br><br>
                <input type="submit" value="Login">
            </form>
            <br>
            <form action="/register" method="post">
                <label for="user_id">Desired User ID:</label><br>
                <input type="text" id="user_id" name="user_id" required><br>
                <label for="password">Desired Password:</label><br>
                <input type="password" id="password" name="password" required><br><br>
                <input type="submit" value="Register">
            </form>
        `);
    }
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { UserName, Password } = req.body;
  console.log("Received registration request:", { UserName, Password }); // Log the received data
  const usersCollection = client.db('ckmdb').collection('User');

  // Insert new user into database
  await usersCollection.insertOne({ UserName, Password });
  console.log("User registered successfully:", { UserName, Password }); // Log successful registration
  res.send('Registration successful!<br><a href="/">Go back to login</a>');
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { UserName, Password } = req.body;
  console.log("Received login request:", { UserName, Password }); // Log the received data
  const usersCollection = client.db('ckmdb').collection('User');

  // Check if the user exists in the database
  const user = await usersCollection.findOne({ UserName, Password });

  if (user) {
      // Generate authentication cookie
      res.cookie('auth', 'authenticated', { maxAge: 60000 }); // Expiring in 1 minute
      console.log("Login successful:", { UserName, Password }); // Log successful login
      res.send('Login successful!<br><a href="/cookies">View active cookies</a>');
  } else {
      console.log("Invalid login attempt:", { UserName, Password }); // Log invalid login attempt
      res.send('Invalid UserName or Password. <a href="/">Go back</a>');
  }
});

// Route to display active cookies
app.get('/cookies', (req, res) => {
    res.send(`
        <h2>Active Cookies</h2>
        <pre>${JSON.stringify(req.cookies, null, 2)}</pre>
        <br>
        <a href="/clearcookie/auth">Clear Authentication Cookie</a>
        <br>
        <a href="/">Go back</a>
    `);
});

// Route to clear a specific cookie
app.get('/clearcookie/:cookiename', (req, res) => {
    const { cookiename } = req.params;
    res.clearCookie(cookiename);
    res.send(`Cookie '${cookiename}' cleared successfully.<br><a href="/">Go back</a>`);
});

// Start server
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
