-- =====================================================
-- Portfolio Website Database
-- Database: portfolio_db
-- Import via phpMyAdmin or: mysql -u root -p < database/portfolio.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS portfolio_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portfolio_db;

-- ─── Admin Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(100) NOT NULL DEFAULT 'Administrator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
-- Default credentials: admin / admin123  (auto-seeded by PHP on first run)

-- ─── Settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  website_title    VARCHAR(150) DEFAULT 'My Portfolio',
  website_logo     VARCHAR(255) DEFAULT '',
  favicon          VARCHAR(255) DEFAULT '',
  footer_text      VARCHAR(255) DEFAULT 'All Rights Reserved.',
  meta_desc        TEXT,
  meta_keywords    VARCHAR(255) DEFAULT '',
  show_hero        TINYINT(1) DEFAULT 1,
  show_about       TINYINT(1) DEFAULT 1,
  show_skills      TINYINT(1) DEFAULT 1,
  show_education   TINYINT(1) DEFAULT 1,
  show_experience  TINYINT(1) DEFAULT 1,
  show_internship  TINYINT(1) DEFAULT 1,
  show_projects    TINYINT(1) DEFAULT 1,
  show_certificates TINYINT(1) DEFAULT 1,
  show_services    TINYINT(1) DEFAULT 1,
  show_contact     TINYINT(1) DEFAULT 1,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO settings (id, website_title, footer_text, meta_desc)
VALUES (1, 'My Portfolio', 'All Rights Reserved.', 'Welcome to my professional portfolio website.')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Hero Section ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hero (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150) DEFAULT '',
  profession       VARCHAR(150) DEFAULT '',
  subtitle         VARCHAR(255) DEFAULT '',
  short_description TEXT,
  resume           VARCHAR(255) DEFAULT '',
  profile_photo    VARCHAR(255) DEFAULT '',
  background_image VARCHAR(255) DEFAULT '',
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO hero (id, name, profession, subtitle, short_description)
VALUES (1, 'Your Name', 'Full Stack Developer', 'I build things for the web',
        'Passionate developer who loves creating beautiful and functional web applications.')
ON DUPLICATE KEY UPDATE id = id;

-- ─── About Section ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS about (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(150) DEFAULT 'About Me',
  description      TEXT,
  birthday         VARCHAR(50)  DEFAULT '',
  phone            VARCHAR(50)  DEFAULT '',
  email            VARCHAR(100) DEFAULT '',
  address          VARCHAR(255) DEFAULT '',
  city             VARCHAR(100) DEFAULT '',
  degree           VARCHAR(150) DEFAULT '',
  experience       VARCHAR(100) DEFAULT '',
  freelance_status VARCHAR(50)  DEFAULT 'Available',
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO about (id, title, description)
VALUES (1, 'About Me', 'Write something about yourself here.')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Skills ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL,
  percentage INT          NOT NULL DEFAULT 0,
  category   VARCHAR(80)  DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO skills (skill_name, percentage, category) VALUES
('HTML5',      90, 'Frontend'),
('CSS3',       85, 'Frontend'),
('JavaScript', 80, 'Frontend'),
('PHP',        82, 'Backend'),
('MySQL',      78, 'Backend'),
('Bootstrap',  88, 'Frontend');

-- ─── Education ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  institute   VARCHAR(200) NOT NULL,
  degree      VARCHAR(150) NOT NULL,
  branch      VARCHAR(150) DEFAULT '',
  start_year  VARCHAR(10)  DEFAULT '',
  end_year    VARCHAR(10)  DEFAULT '',
  cgpa        VARCHAR(20)  DEFAULT '',
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO education (institute, degree, branch, start_year, end_year, cgpa, description) VALUES
('Your University', 'Bachelor of Technology', 'Computer Science', '2020', '2024', '8.5 CGPA',
 'Studied core computer science subjects including algorithms, databases, and software engineering.');

-- ─── Experience ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  company     VARCHAR(200) NOT NULL,
  position    VARCHAR(150) NOT NULL,
  duration    VARCHAR(100) DEFAULT '',
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO experience (company, position, duration, description) VALUES
('Your Company', 'Junior Developer', 'Jan 2024 – Present',
 'Developed and maintained web applications using PHP, MySQL, and Bootstrap 5.');

-- ─── Internships ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  company          VARCHAR(200) NOT NULL,
  role             VARCHAR(150) NOT NULL,
  duration         VARCHAR(100) DEFAULT '',
  location         VARCHAR(100) DEFAULT '',
  description      TEXT,
  certificate_link VARCHAR(255) DEFAULT '',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO internships (company, role, duration, location, description) VALUES
('Tech Corp', 'Web Development Intern', 'Jun 2024 – Aug 2024', 'Remote',
 'Built responsive web interfaces and integrated RESTful APIs.');

-- ─── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  technologies VARCHAR(255) DEFAULT '',
  github_link  VARCHAR(255) DEFAULT '',
  live_link    VARCHAR(255) DEFAULT '',
  image        VARCHAR(255) DEFAULT '',
  featured     TINYINT(1)   DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO projects (title, description, technologies, github_link, live_link, featured) VALUES
('Portfolio Website', 'A dynamic portfolio website with admin dashboard built using PHP and MySQL.',
 'PHP, MySQL, Bootstrap 5, JavaScript', 'https://github.com/', 'https://example.com/', 1),
('E-Commerce App', 'A full-featured e-commerce application with cart and payment integration.',
 'PHP, MySQL, Bootstrap 5, Stripe', 'https://github.com/', '', 0);

-- ─── Certificates ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  cert_name    VARCHAR(200) NOT NULL,
  organization VARCHAR(200) DEFAULT '',
  cert_date    VARCHAR(50)  DEFAULT '',
  image        VARCHAR(255) DEFAULT '',
  cert_url     VARCHAR(255) DEFAULT '',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO certificates (cert_name, organization, cert_date) VALUES
('Web Development Bootcamp', 'Udemy',    'January 2024'),
('PHP & MySQL Certificate',  'Coursera', 'March 2024');

-- ─── Services ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(150) NOT NULL,
  icon         VARCHAR(100) DEFAULT 'fa-solid fa-star',
  description  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO services (service_name, icon, description) VALUES
('Web Development',  'fa-solid fa-code',    'Building responsive, fast, and modern websites from scratch.'),
('UI/UX Design',     'fa-solid fa-palette', 'Creating beautiful and intuitive user interfaces and experiences.'),
('Database Design',  'fa-solid fa-database','Designing efficient, normalized, and scalable database schemas.');

-- ─── Contact ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  phone      VARCHAR(50)  DEFAULT '',
  email      VARCHAR(100) DEFAULT '',
  address    VARCHAR(255) DEFAULT '',
  map_link   TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO contact (id, phone, email, address)
VALUES (1, '+91 9999999999', 'you@example.com', 'Your City, Country')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Social Links ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  github     VARCHAR(255) DEFAULT '',
  linkedin   VARCHAR(255) DEFAULT '',
  instagram  VARCHAR(255) DEFAULT '',
  facebook   VARCHAR(255) DEFAULT '',
  twitter    VARCHAR(255) DEFAULT '',
  youtube    VARCHAR(255) DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO social (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id;

-- ─── Contact Messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sender_name  VARCHAR(100) NOT NULL,
  sender_email VARCHAR(100) NOT NULL,
  subject      VARCHAR(200) DEFAULT '',
  message      TEXT NOT NULL,
  is_read      TINYINT(1)   DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Registered Users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
