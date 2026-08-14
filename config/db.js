/**
 * config/db.js
 * Database connection wrapper supporting MySQL and SQLite fallback.
 * Implements auto-migration and seeding on start.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbType = 'sqlite';
let pool = null; // for MySQL
let sqliteDb = null; // for SQLite

// Load environment variables if .env exists
require('dotenv').config();

const useSqlite = process.env.USE_SQLITE !== 'false' && (!process.env.DB_HOST || process.env.USE_SQLITE === 'true');

async function initDatabase() {
  if (!useSqlite) {
    // Try MySQL connection
    const mysql = require('mysql2/promise');
    try {
      dbType = 'mysql';
      // Create connection pool
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'portfolio_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      // Test connection
      const conn = await pool.getConnection();
      console.log('Connected to MySQL Database.');
      conn.release();
    } catch (err) {
      console.warn('MySQL connection failed, falling back to SQLite:', err.message);
      dbType = 'sqlite';
    }
  }

  if (dbType === 'sqlite') {
    const sqlite3 = require('sqlite3').verbose();
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'portfolio.sqlite');
    console.log(`Using SQLite Database at: ${dbPath}`);
    
    sqliteDb = new sqlite3.Database(dbPath);
    
    // Promisify sqlite3 runs/all
    sqliteDb.runAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      });
    };
    
    sqliteDb.allAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };
  }

  // Ensure tables and seed data exist
  await migrateAndSeed();
}

async function query(sql, params = []) {
  // Translate limit/offset or any differences if necessary, but standard SQL works for both
  if (dbType === 'mysql') {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else {
    // Replace MySQL specific syntax if any, but standard SELECT/INSERT/UPDATE are identical.
    // Replace ON DUPLICATE KEY UPDATE with INSERT OR REPLACE or handle separately if needed,
    // though the migrations use standard syntax or we handle it in JS.
    const isInsertOrUpdate = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(sql);
    if (isInsertOrUpdate) {
      return await sqliteDb.runAsync(sql, params);
    } else {
      return await sqliteDb.allAsync(sql, params);
    }
  }
}

// Helper to check if tables exist and create them
async function migrateAndSeed() {
  // Table Creation queries
  const tableQueries = [
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL DEFAULT 'Administrator',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      website_title VARCHAR(150) DEFAULT 'My Portfolio',
      website_logo VARCHAR(255) DEFAULT '',
      favicon VARCHAR(255) DEFAULT '',
      footer_text VARCHAR(255) DEFAULT 'All Rights Reserved.',
      meta_desc TEXT,
      meta_keywords VARCHAR(255) DEFAULT '',
      show_hero TINYINT(1) DEFAULT 1,
      show_about TINYINT(1) DEFAULT 1,
      show_skills TINYINT(1) DEFAULT 1,
      show_education TINYINT(1) DEFAULT 1,
      show_experience TINYINT(1) DEFAULT 1,
      show_internship TINYINT(1) DEFAULT 1,
      show_projects TINYINT(1) DEFAULT 1,
      show_certificates TINYINT(1) DEFAULT 1,
      show_services TINYINT(1) DEFAULT 1,
      show_contact TINYINT(1) DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS hero (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(150) DEFAULT '',
      profession VARCHAR(150) DEFAULT '',
      subtitle VARCHAR(255) DEFAULT '',
      short_description TEXT,
      resume VARCHAR(255) DEFAULT '',
      profile_photo VARCHAR(255) DEFAULT '',
      background_image VARCHAR(255) DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS about (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(150) DEFAULT 'About Me',
      description TEXT,
      birthday VARCHAR(50) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      address VARCHAR(255) DEFAULT '',
      city VARCHAR(100) DEFAULT '',
      degree VARCHAR(150) DEFAULT '',
      experience VARCHAR(100) DEFAULT '',
      freelance_status VARCHAR(50) DEFAULT 'Available',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      skill_name VARCHAR(100) NOT NULL,
      percentage INT NOT NULL DEFAULT 0,
      category VARCHAR(80) DEFAULT 'General',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      institute VARCHAR(200) NOT NULL,
      degree VARCHAR(150) NOT NULL,
      branch VARCHAR(150) DEFAULT '',
      start_year VARCHAR(10) DEFAULT '',
      end_year VARCHAR(10) DEFAULT '',
      cgpa VARCHAR(20) DEFAULT '',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS experience (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      company VARCHAR(200) NOT NULL,
      position VARCHAR(150) NOT NULL,
      duration VARCHAR(100) DEFAULT '',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      company VARCHAR(200) NOT NULL,
      role VARCHAR(150) NOT NULL,
      duration VARCHAR(100) DEFAULT '',
      location VARCHAR(100) DEFAULT '',
      description TEXT,
      certificate_link VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      technologies VARCHAR(255) DEFAULT '',
      github_link VARCHAR(255) DEFAULT '',
      live_link VARCHAR(255) DEFAULT '',
      image VARCHAR(255) DEFAULT '',
      featured TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      cert_name VARCHAR(200) NOT NULL,
      organization VARCHAR(200) DEFAULT '',
      cert_date VARCHAR(50) DEFAULT '',
      image VARCHAR(255) DEFAULT '',
      cert_url VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      service_name VARCHAR(150) NOT NULL,
      icon VARCHAR(100) DEFAULT 'fa-solid fa-star',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contact (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      address VARCHAR(255) DEFAULT '',
      map_link TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS social (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      github VARCHAR(255) DEFAULT '',
      linkedin VARCHAR(255) DEFAULT '',
      instagram VARCHAR(255) DEFAULT '',
      facebook VARCHAR(255) DEFAULT '',
      twitter VARCHAR(255) DEFAULT '',
      youtube VARCHAR(255) DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      sender_name VARCHAR(100) NOT NULL,
      sender_email VARCHAR(100) NOT NULL,
      subject VARCHAR(200) DEFAULT '',
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  // For SQLite, we must replace AUTO_INCREMENT with AUTOINCREMENT, INTEGER PRIMARY KEY with INTEGER PRIMARY KEY
  for (let q of tableQueries) {
    if (dbType === 'sqlite') {
      q = q.replace(/INTEGER PRIMARY KEY AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
      q = q.replace(/TINYINT\(1\)/gi, 'INTEGER');
      await sqliteDb.runAsync(q);
    } else {
      await pool.execute(q);
    }
  }

  // Seed default admin
  const admins = await query("SELECT COUNT(*) AS cnt FROM admin_users");
  const count = dbType === 'mysql' ? admins[0].cnt : admins[0].cnt;
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await query("INSERT INTO admin_users (username, password, name) VALUES (?, ?, ?)", ['admin', hash, 'Administrator']);
    console.log('Seeded default admin user (admin / admin123).');
  }

  // Seed settings if empty
  const settingsRows = await query("SELECT COUNT(*) AS cnt FROM settings");
  if (settingsRows[0].cnt === 0) {
    await query(`INSERT INTO settings (id, website_title, footer_text, meta_desc) 
      VALUES (1, 'My Portfolio', 'All Rights Reserved.', 'Professional portfolio website.')`);
  }

  // Seed initial empty hero record if none exists
  const heroRows = await query("SELECT COUNT(*) AS cnt FROM hero");
  if (heroRows[0].cnt === 0) {
    await query(`INSERT INTO hero (id, name, profession, subtitle, short_description)
      VALUES (1, '', '', '', '')`);
  }

  // Seed initial empty about record if none exists
  const aboutRows = await query("SELECT COUNT(*) AS cnt FROM about");
  if (aboutRows[0].cnt === 0) {
    await query(`INSERT INTO about (id, title, description) VALUES (1, 'About Me', '')`);
  }

  // Seed initial empty contact record if none exists
  const contactRows = await query("SELECT COUNT(*) AS cnt FROM contact");
  if (contactRows[0].cnt === 0) {
    await query(`INSERT INTO contact (id, phone, email, address) VALUES (1, '', '', '')`);
  }

  // Seed initial empty social record if none exists
  const socialRows = await query("SELECT COUNT(*) AS cnt FROM social");
  if (socialRows[0].cnt === 0) {
    await query(`INSERT INTO social (id) VALUES (1)`);
  }
}

module.exports = {
  initDatabase,
  query,
  getDbType: () => dbType
};
