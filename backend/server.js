const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 5000;

// Enable CORS to allow frontend communication
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());

// MySQL Connection Setup
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',     // XAMPP MySQL server
  user: process.env.DB_USER,           // Default XAMPP username for MySQL
  password: process.env.DB_PASSWORD,           // Default XAMPP MySQL password (empty by default)
  database: process.env.DB_NAME, // Name of your database created in phpMyAdmin
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

/* Admin login alias */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    res.json({
      success: true, token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Employee login */
app.post('/api/employee/login', async (req, res) => {
  try {
    const { full_name } = req.body;
    if (!full_name)
      return res.status(400).json({ success: false, message: 'Full name required.' });

    const [rows] = await pool.execute(
      `SELECT * FROM employees WHERE CONCAT(first_name, ' ', last_name) LIKE ? 
       OR CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ? LIMIT 1`,
      [`%${full_name}%`, `%${full_name}%`]
    );

    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Employee not found.' });

    const employee = rows[0];
    const token = jwt.sign(
      { id: employee.id, full_name, role: 'employee' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    res.json({ success: true, token, user: employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Start the backend server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
