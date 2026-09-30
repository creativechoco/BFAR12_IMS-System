CREATE DATABASE IF NOT EXISTS company_id_system;
USE company_id_system;

-- Admin users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hr', 'viewer') DEFAULT 'hr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  position VARCHAR(150),
  department VARCHAR(150),
  home_address TEXT,
  contact_number VARCHAR(20),
  blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  photo_url VARCHAR(500),
  -- Government IDs
  sss_number VARCHAR(50),
  pagibig_number VARCHAR(50),
  tin_number VARCHAR(50),
  philhealth_number VARCHAR(50),
  -- Emergency Contact
  emergency_name VARCHAR(255),
  emergency_contact VARCHAR(20),
  emergency_relationship VARCHAR(100),
  -- Meta
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Default admin user (password: Admin@123)
INSERT INTO users (email, password, full_name, role) VALUES
('admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'System Administrator', 'admin')
ON DUPLICATE KEY UPDATE email = email;

-- Sample employees
INSERT INTO employees (id_number, first_name, middle_name, last_name, position, department, home_address, contact_number, blood_type, sss_number, pagibig_number, tin_number, philhealth_number, emergency_name, emergency_contact, emergency_relationship) VALUES
('CORP-0001', 'Maria', 'Santos', 'Dela Cruz', 'Software Engineer', 'Engineering', '123 Rizal St., Makati City, Metro Manila', '09171234567', 'O+', '12-3456789-0', '1234-5678-9012', '123-456-789-000', '12-345678901-2', 'Juan Dela Cruz', '09189876543', 'Spouse'),
('CORP-0002', 'Jose', 'Reyes', 'Bautista', 'HR Manager', 'Human Resources', '456 Bonifacio Ave., Quezon City, Metro Manila', '09281234567', 'A+', '23-4567890-1', '2345-6789-0123', '234-567-890-000', '23-456789012-3', 'Ana Bautista', '09279876543', 'Sibling')
ON DUPLICATE KEY UPDATE id_number = id_number;
