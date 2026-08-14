# Dynamic Portfolio Website with Admin Dashboard (PHP + MySQL + Bootstrap 5)

A complete, production-ready **Dynamic Portfolio Website** where **no portfolio content is hardcoded**. Every piece of content — Hero, About, Skills, Education, Experience, Projects, Certificates, Services, Contact, Social Links, and Branding Settings — is fully managed via a secure Admin Dashboard and stored in a MySQL database (`portfolio_db`).

---

## Features

### 🌐 Public Frontend
- **100% Dynamic Content**: Loaded live from MySQL database with no hardcoded info.
- **Modern UI & Aesthetic**: Custom dark/light mode toggle with smooth glassmorphism design.
- **Interactive Components**:
  - Rotating text banner powered by Typed.js.
  - Scroll animations using AOS.
  - Animated skill progress bars.
  - AJAX contact form submission with instant feedback.
- **Responsive**: Fully optimized for mobile, tablet, laptop, and desktop.
- **SEO Ready**: Meta descriptions, OpenGraph tags, semantic HTML5 structure.

### 🛡 Admin Dashboard
- **Secure Authentication**:
  - Password hashing with `password_verify()`.
  - CSRF Token verification on login and forms.
  - Session hijacking protection with `session_regenerate_id()`.
  - SQL Injection protection using PDO/MySQLi Prepared Statements.
- **Comprehensive CRUD Operations**:
  - **Hero Section**: Name, profession, subtitle, short bio, profile photo upload, background image, resume upload.
  - **About Section**: Full bio, birthday, phone, email, address, city, degree, experience, freelance status.
  - **Skills**: Skill name, percentage range slider (0–100%), category tags.
  - **Education**: Institute, degree, branch, start year, end year, CGPA, description.
  - **Experience**: Company, position, duration, description.
  - **Projects**: Title, description, technologies used, GitHub link, live demo link, image upload, featured item toggle.
  - **Certificates**: Certificate name, issuing organization, date, certificate link, image upload.
  - **Services**: Service name, Font Awesome icon selection with live preview, description.
  - **Contact Info**: Phone, email, physical address, Google Maps embed link.
  - **Social Links**: GitHub, LinkedIn, Instagram, Twitter/X, Facebook, YouTube links.
  - **Contact Messages**: View incoming messages with read status, delete messages.
  - **Site Settings**: Website title, logo upload, favicon upload, footer copyright text, SEO keywords.
  - **Password Manager**: Update admin account password securely.
- **Dashboard UI**:
  - Real-time stat cards (Total Skills, Projects, Certificates, Education, Experience, Services).
  - DataTables integration with live search and pagination.
  - SweetAlert2 delete confirmation prompts and toast notifications.
  - Live image preview before uploading.

---

## Folder Structure

```
Portfolio/
├── index.php                 # Public portfolio homepage
├── login.php                 # Admin login page
├── logout.php                # Admin logout handler
├── contact_submit.php        # Contact form AJAX endpoint
├── config.php                # Bootstrap entry wrapper
│
├── config/
│   └── database.php          # Database connection, credentials, helper functions, CSRF guard
│
├── includes/
│   ├── header.php            # Public head, SEO tags, CSS imports
│   ├── navbar.php            # Fixed responsive navigation bar & dark mode toggle
│   └── footer.php            # Site footer & JS script includes
│
├── admin/
│   ├── dashboard.php         # Admin overview dashboard with stat cards
│   ├── add_hero.php          # Hero section CRUD
│   ├── add_about.php         # About section CRUD
│   ├── add_skills.php        # Skills CRUD
│   ├── add_education.php     # Education CRUD
│   ├── add_experience.php    # Experience CRUD
│   ├── add_projects.php      # Projects CRUD
│   ├── add_certificates.php  # Certificates CRUD
│   ├── add_services.php      # Services CRUD
│   ├── add_contact.php       # Contact information CRUD
│   ├── add_social.php        # Social media links CRUD
│   ├── messages.php          # Contact form messages viewer
│   ├── settings.php          # Website branding, logo, favicon & SEO settings
│   ├── change_password.php   # Admin password update script
│   ├── header.php            # Admin header & topbar
│   ├── sidebar.php           # Admin sidebar navigation
│   └── footer.php            # Admin footer & SweetAlert/DataTables scripts
│
├── uploads/
│   ├── profile/              # Profile photos & background images
│   ├── projects/             # Project screenshots
│   ├── certificates/         # Certificate images
│   ├── resumes/              # Resume documents (PDF/DOC)
│   └── logo/                 # Site logo & favicon files
│
├── assets/
│   ├── css/
│   │   ├── style.css         # Public portfolio stylesheet (light/dark mode)
│   │   └── admin.css         # Admin dashboard dark theme stylesheet
│   └── js/
│       ├── main.js           # Public JavaScript (AOS, Typed.js, dark mode, AJAX)
│       └── admin.js          # Admin JavaScript (DataTables, SweetAlert2, previews)
│
├── database/
│   └── portfolio.sql         # Full MySQL database schema & sample seed data
│
└── README.md                 # Setup guide & project documentation
```

---

## Installation & Setup on XAMPP

### Step 1: Clone / Copy to XAMPP htdocs
Copy the `Portfolio` folder into your XAMPP `htdocs` directory:
```
C:\xampp\htdocs\Portfolio
```

### Step 2: Start Apache & MySQL in XAMPP Control Panel
Open **XAMPP Control Panel** and click **Start** for both **Apache** and **MySQL**.

### Step 3: Import the MySQL Database
1. Open your browser and go to `http://localhost/phpmyadmin/`.
2. Click **New** on the left menu and create a database named:
   ```
   portfolio_db
   ```
3. Select `portfolio_db` and click the **Import** tab.
4. Choose the file `database/portfolio.sql` located inside `C:\xampp\htdocs\Portfolio\database\portfolio.sql`.
5. Click **Import** at the bottom.

### Step 4: Verify Database Credentials
If your local XAMPP MySQL has a password or a different host, edit `config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', ''); // Change if you set a MySQL password
define('DB_NAME', 'portfolio_db');
```

---

## Default Admin Credentials

- **Login URL**: `http://localhost/Portfolio/login.php`
- **Username**: `admin`
- **Password**: `admin123`

*(You can update your password anytime under **Settings > Change Admin Password**).*

---

## Security Practices Applied

1. **Prepared Statements**: All database operations (`INSERT`, `UPDATE`, `DELETE`, `SELECT`) use MySQLi prepared statements to prevent SQL Injection.
2. **XSS Protection**: All user input rendered in HTML is sanitized using `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
3. **CSRF Tokens**: Form submissions are verified with session-backed CSRF tokens.
4. **File Upload Security**: File extensions are checked against allowlists (`jpg`, `jpeg`, `png`, `webp`, `pdf`, `doc`), randomized filenames are generated, and files are saved with safe permissions.
5. **Session Security**: Session tokens are regenerated upon successful login (`session_regenerate_id(true)`).

---

## Troubleshooting

- **Database Connection Error**: Verify Apache and MySQL are running in XAMPP. Ensure the database name is `portfolio_db`.
- **Image Upload Issues**: Ensure the `uploads/` subdirectories (`uploads/profile`, `uploads/projects`, `uploads/certificates`, `uploads/resumes`, `uploads/logo`) exist and have write permissions.
