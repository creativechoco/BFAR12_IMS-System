require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Middleware ── */
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Uploads ── */
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

/* ── Database ── */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || '',
  waitForConnections: true,
  connectionLimit: 10,
});

/* ── Test DB ── */
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected | user:', process.env.DB_USER, '| db:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('❌ MySQL error:', err.message);
  }
})();

/* ── Auth Middleware ── */
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  try {
    req.user = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/* ══ ROUTES ══════════════════════════════════════════ */

/* Health check */
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BFAR 12-IMS API running', time: new Date() });
});

/* Admin login */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );
    res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, full_name: user.name } });
  } catch (err) {
    console.error('Login error:', err);
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
      `SELECT * FROM employees WHERE CONCAT(first_name,' ',last_name) LIKE ? LIMIT 1`,
      [`%${full_name}%`]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Employee not found.' });

    const token = jwt.sign(
      { id: rows[0].id, full_name, role: 'employee' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );
    res.json({ success: true, token, user: rows[0] });
  } catch (err) {
    console.error('Employee login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Auth me */
app.get('/api/auth/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* Get employees */
app.get('/api/employees', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let q = 'SELECT * FROM employees WHERE 1=1';
    const p = [];
    if (search) {
      q += ' AND (first_name LIKE ? OR last_name LIKE ? OR id_number LIKE ?)';
      p.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    p.push(parseInt(limit), offset);
    const [rows] = await pool.execute(q, p);
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM employees');
    res.json({ success: true, data: rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Get next ID */
app.get('/api/employees/next-id', auth, async (req, res) => {
  try {
    const type = req.query.type || 'regular';
    let id;
    if (type === 'jo') {
      const [r] = await pool.execute(
        "SELECT id_number FROM employees WHERE id_number LIKE 'BFAR12-JO/COS-%' ORDER BY id DESC LIMIT 1"
      );
      const n = r.length ? parseInt(r[0].id_number.match(/(\d+)$/)?.[1] || 0) + 1 : 1;
      id = `BFAR12-JO/COS-${String(n).padStart(3,'0')}`;
    } else {
      const [r] = await pool.execute(
        "SELECT id_number FROM employees WHERE id_number LIKE 'BFAR12-%' AND id_number NOT LIKE 'BFAR12-JO%' ORDER BY id DESC LIMIT 1"
      );
      const n = r.length ? parseInt(r[0].id_number.match(/(\d+)$/)?.[1] || 0) + 1 : 1;
      id = `BFAR12-${String(n).padStart(3,'0')}`;
    }
    res.json({ success: true, id_number: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Get single employee */
app.get('/api/employees/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Multer setup */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `emp-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* Create employee */
app.post('/api/employees', auth, upload.single('photo'), async (req, res) => {
  try {
    const f = req.body;
    if (!f.first_name || !f.last_name)
      return res.status(400).json({ success: false, message: 'First and last name required.' });
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const [result] = await pool.execute(
      `INSERT INTO employees (id_number, employee_type, first_name, middle_name, last_name,
        position, department, home_address, contact_number, date_of_birth, blood_type, photo_url,
        sss_number, pagibig_number, tin_number, philhealth_number,
        emergency_name, emergency_contact, emergency_relationship, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [f.id_number, f.employee_type||'regular', f.first_name, f.middle_name||null, f.last_name,
       f.position||null, f.department||null, f.home_address||null, f.contact_number||null,
       f.date_of_birth||null, f.blood_type||null, photo_url,
       f.sss_number||null, f.pagibig_number||null, f.tin_number||null, f.philhealth_number||null,
       f.emergency_name||null, f.emergency_contact||null, f.emergency_relationship||null,
       f.status||'active']
    );
    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Update employee */
app.put('/api/employees/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    const f = req.body;
    const [ex] = await pool.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: 'Not found.' });
    const photo_url = req.file ? `/uploads/${req.file.filename}` : ex[0].photo_url;
    await pool.execute(
      `UPDATE employees SET first_name=?,middle_name=?,last_name=?,position=?,department=?,
        home_address=?,contact_number=?,date_of_birth=?,blood_type=?,photo_url=?,
        sss_number=?,pagibig_number=?,tin_number=?,philhealth_number=?,
        emergency_name=?,emergency_contact=?,emergency_relationship=?,status=?
       WHERE id=?`,
      [f.first_name, f.middle_name||null, f.last_name, f.position||null, f.department||null,
       f.home_address||null, f.contact_number||null, f.date_of_birth||null, f.blood_type||null,
       photo_url, f.sss_number||null, f.pagibig_number||null, f.tin_number||null,
       f.philhealth_number||null, f.emergency_name||null, f.emergency_contact||null,
       f.emergency_relationship||null, f.status||'active', req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* Delete employee */
app.delete('/api/employees/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM employees WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    await pool.execute('DELETE FROM employees WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
