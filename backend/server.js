const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 5000;

// Enable CORS to allow frontend communication
app.use(cors());
app.use(express.json());

// MySQL Connection Setup
const db = mysql.createConnection({
  host: 'localhost',      // XAMPP MySQL server
  user: 'root',           // Default XAMPP username for MySQL
  password: '',           // Default XAMPP MySQL password (empty by default)
  database: 'id_system' // Name of your database created in phpMyAdmin
});

// Test MySQL Connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Sample API route to fetch data from MySQL
app.get('/api/users', (req, res) => {
  // Query to select all users from the 'users' table
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Error fetching users' });
    }
    res.json(results);  // Send the results (users) as JSON response
  });
});

// Start the backend server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
