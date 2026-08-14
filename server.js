/**
 * server.js
 * Main entrypoint for the Node.js / Express Portfolio Application.
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const db = require('./config/db');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup EJS views engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'portfolio-secret-key-12345',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Setup uploads directories structure
const uploadDirs = [
  'uploads/profile',
  'uploads/projects',
  'uploads/certificates',
  'uploads/resumes',
  'uploads/logo'
];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';
    if (file.fieldname === 'profile_photo' || file.fieldname === 'background_image') {
      folder += 'profile/';
    } else if (file.fieldname === 'resume') {
      folder += 'resumes/';
    } else if (file.fieldname === 'image') {
      if (req.originalUrl.includes('projects')) {
        folder += 'projects/';
      } else if (req.originalUrl.includes('certificates')) {
        folder += 'certificates/';
      }
    } else if (file.fieldname === 'website_logo' || file.fieldname === 'favicon') {
      folder += 'logo/';
    }
    cb(null, path.join(__dirname, folder));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = crypto.randomBytes(8).toString('hex') + '_' + Math.floor(Date.now() / 1000) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Static assets & uploads serving
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Injection of helpers & session variables into views
app.use(auth.localsMiddleware);

// CSRF check for POSTs
app.use(auth.verifyCsrf);

// Helper function to delete old uploaded files
function deleteOldFile(folder, filename) {
  if (filename) {
    const filePath = path.join(__dirname, folder, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
      }
    }
  }
}

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

// Homepage
app.get('/', async (req, res) => {
  try {
    const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");
    const [hero] = await db.query("SELECT * FROM hero WHERE id = 1");
    const [about] = await db.query("SELECT * FROM about WHERE id = 1");
    const [contact] = await db.query("SELECT * FROM contact WHERE id = 1");
    const [social] = await db.query("SELECT * FROM social WHERE id = 1");

    const skills = await db.query("SELECT * FROM skills ORDER BY percentage DESC, id ASC");
    const education = await db.query("SELECT * FROM education ORDER BY start_year DESC, id DESC");
    const experience = await db.query("SELECT * FROM experience ORDER BY id DESC");
    const internships = await db.query("SELECT * FROM internships ORDER BY id DESC");
    const projects = await db.query("SELECT * FROM projects ORDER BY featured DESC, id DESC");
    const certificates = await db.query("SELECT * FROM certificates ORDER BY id DESC");
    const services = await db.query("SELECT * FROM services ORDER BY id ASC");

    // Default stats
    const totalProj = projects.length;
    const totalCerts = certificates.length;

    res.render('index', {
      settings: settings || {},
      hero: hero || {},
      about: about || {},
      contact: contact || {},
      social: social || {},
      skills,
      education,
      experience,
      internships,
      projects,
      certificates,
      services,
      totalProj,
      totalCerts
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error occurred.');
  }
});

// Contact Form AJAX Handler
app.post('/contact_submit', async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const subject = (req.body.subject || '').trim();
  const message = (req.body.message || '').trim();

  if (!name || !email || !message) {
    return res.json({ success: false, msg: 'All fields are required.' });
  }

  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.json({ success: false, msg: 'Invalid email address.' });
  }

  try {
    await db.query(
      "INSERT INTO contact_messages (sender_name, sender_email, subject, message) VALUES (?, ?, ?, ?)",
      [name, email, subject, message]
    );
    res.json({ success: true, msg: 'Your message has been sent successfully!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, msg: 'Failed to save message. Please try again.' });
  }
});

// ─── LOGIN & REGISTER ROUTES ──────────────────────────────────────────────

// GET Login
app.get('/login', auth.requireNoLogin, async (req, res) => {
  const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");
  res.render('login', { settings: settings || {}, error: '' });
});

app.get('/login', auth.requireNoLogin, async (req, res) => {
  res.redirect('/login');
});

// POST Login
app.post('/login', auth.requireNoLogin, async (req, res) => {
  const identifier = (req.body.username || '').trim();
  const password = req.body.password || '';
  const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");

  if (!identifier || !password) {
    return res.render('login', { settings: settings || {}, error: 'Please enter both username/email and password.' });
  }

  try {
    // 1. Check admin_users table (by username)
    let rows = await db.query("SELECT id, username, password, name FROM admin_users WHERE LOWER(username) = LOWER(?) LIMIT 1", [identifier]);
    if (rows.length === 1) {
      const admin = rows[0];
      if (await bcrypt.compare(password, admin.password)) {
        req.session.admin_id = admin.id;
        req.session.admin_name = admin.name;
        req.session.admin_user = admin.username;
        auth.setFlash(req, 'success', `Welcome back, ${admin.name}!`);
        return res.redirect('/admin/dashboard');
      }
    }

    // 2. Check users table (by email OR name, case-insensitive)
    rows = await db.query("SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1", [identifier, identifier]);
    if (rows.length === 1) {
      const user = rows[0];
      if (await bcrypt.compare(password, user.password_hash)) {
        req.session.admin_id = user.id;
        req.session.admin_name = user.name;
        req.session.admin_user = user.email;
        auth.setFlash(req, 'success', `Welcome back, ${user.name}!`);
        return res.redirect('/admin/dashboard');
      }
    }

    res.render('login', { settings: settings || {}, error: 'Invalid username/email or password.' });
  } catch (err) {
    console.error(err);
    res.render('login', { settings: settings || {}, error: 'An error occurred. Please try again.' });
  }
});

// GET Register
app.get('/register', auth.requireNoLogin, async (req, res) => {
  const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");
  res.render('register', { settings: settings || {}, errors: {}, success: false, name: '', email: '' });
});

app.get('/register', auth.requireNoLogin, async (req, res) => {
  res.redirect('/register');
});

// POST Register
app.post('/register', auth.requireNoLogin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const confirm_password = req.body.confirm_password || '';
  const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");

  const errors = {};
  if (!name) errors.name = 'Please enter your full name.';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!email) errors.email = 'Please enter your email address.';
  else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.email = 'Please enter a valid email address.';
    else {
      const rows = await db.query("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", [email]);
      if (rows.length > 0) errors.email = 'This email is already registered.';
    }
  }

  if (!password) errors.password = 'Please enter a password.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

  if (!confirm_password) errors.confirm_password = 'Please confirm your password.';
  else if (password !== confirm_password) errors.confirm_password = 'Passwords do not match.';

  if (Object.keys(errors).length > 0) {
    return res.render('register', { settings: settings || {}, errors, success: false, name, email });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, hash]);
    res.render('register', { settings: settings || {}, errors: {}, success: true, name: '', email: '' });
  } catch (err) {
    console.error(err);
    res.render('register', { settings: settings || {}, errors: { general: 'Failed to register. Try again.' }, success: false, name, email });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  res.redirect('/logout');
});


// ─── ADMIN DASHBOARD & CRUD ROUTES ────────────────────────────────────────

app.use('/admin', auth.requireLogin);

// Dashboard Homepage
app.get('/admin/dashboard', async (req, res) => {
  try {
    const [settings] = await db.query("SELECT * FROM settings WHERE id = 1");
    const [skillsCount] = await db.query("SELECT COUNT(*) AS cnt FROM skills");
    const [projectsCount] = await db.query("SELECT COUNT(*) AS cnt FROM projects");
    const [certsCount] = await db.query("SELECT COUNT(*) AS cnt FROM certificates");
    const [eduCount] = await db.query("SELECT COUNT(*) AS cnt FROM education");
    const [expCount] = await db.query("SELECT COUNT(*) AS cnt FROM experience");
    const [internCount] = await db.query("SELECT COUNT(*) AS cnt FROM internships");
    const [servicesCount] = await db.query("SELECT COUNT(*) AS cnt FROM services");

    const stats = {
      skills: skillsCount.cnt,
      projects: projectsCount.cnt,
      certificates: certsCount.cnt,
      education: eduCount.cnt,
      experience: expCount.cnt,
      internships: internCount.cnt,
      services: servicesCount.cnt
    };

    res.render('admin/dashboard', {
      pageTitle: 'Dashboard',
      settings: settings || {},
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Update Dashboard Visibility Settings
app.post('/admin/dashboard', async (req, res) => {
  const show_hero = req.body.show_hero ? 1 : 0;
  const show_about = req.body.show_about ? 1 : 0;
  const show_skills = req.body.show_skills ? 1 : 0;
  const show_education = req.body.show_education ? 1 : 0;
  const show_experience = req.body.show_experience ? 1 : 0;
  const show_internship = req.body.show_internship ? 1 : 0;
  const show_projects = req.body.show_projects ? 1 : 0;
  const show_certificates = req.body.show_certificates ? 1 : 0;
  const show_services = req.body.show_services ? 1 : 0;
  const show_contact = req.body.show_contact ? 1 : 0;

  try {
    await db.query(
      `UPDATE settings SET 
        show_hero=?, show_about=?, show_skills=?, show_education=?, show_experience=?, 
        show_internship=?, show_projects=?, show_certificates=?, show_services=?, show_contact=? 
       WHERE id=1`,
      [show_hero, show_about, show_skills, show_education, show_experience, show_internship, show_projects, show_certificates, show_services, show_contact]
    );
    auth.setFlash(req, 'success', 'Section visibility updated successfully.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update settings.');
  }
});

// Hero Details CRUD
app.get('/admin/add_hero', async (req, res) => {
  const [hero] = await db.query("SELECT * FROM hero WHERE id=1");
  res.render('admin/add_hero', { pageTitle: 'Hero Section', hero: hero || {} });
});

app.post('/admin/add_hero', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'background_image', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), async (req, res) => {
  const name = (req.body.name || '').trim();
  const profession = (req.body.profession || '').trim();
  const subtitle = (req.body.subtitle || '').trim();
  const short_description = (req.body.short_description || '').trim();

  try {
    const [currentHero] = await db.query("SELECT profile_photo, background_image, resume FROM hero WHERE id=1");

    let profile_photo = currentHero ? currentHero.profile_photo : '';
    let background_image = currentHero ? currentHero.background_image : '';
    let resume = currentHero ? currentHero.resume : '';

    if (req.files.profile_photo) {
      deleteOldFile('uploads/profile/', profile_photo);
      profile_photo = req.files.profile_photo[0].filename;
    }
    if (req.files.background_image) {
      deleteOldFile('uploads/profile/', background_image);
      background_image = req.files.background_image[0].filename;
    }
    if (req.files.resume) {
      deleteOldFile('uploads/resumes/', resume);
      resume = req.files.resume[0].filename;
    }

    await db.query(
      `UPDATE hero SET name=?, profession=?, subtitle=?, short_description=?, profile_photo=?, background_image=?, resume=? WHERE id=1`,
      [name, profession, subtitle, short_description, profile_photo, background_image, resume]
    );

    auth.setFlash(req, 'success', 'Hero section updated successfully.');
    res.redirect('/admin/add_hero');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update Hero section.');
  }
});

// About Section CRUD
app.get('/admin/add_about', async (req, res) => {
  const [about] = await db.query("SELECT * FROM about WHERE id=1");
  res.render('admin/add_about', { pageTitle: 'About Section', about: about || {} });
});

app.post('/admin/add_about', async (req, res) => {
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const birthday = (req.body.birthday || '').trim();
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();
  const address = (req.body.address || '').trim();
  const city = (req.body.city || '').trim();
  const degree = (req.body.degree || '').trim();
  const experience = (req.body.experience || '').trim();
  const freelance_status = (req.body.freelance_status || '').trim();

  try {
    await db.query(
      `UPDATE about SET title=?, description=?, birthday=?, phone=?, email=?, address=?, city=?, degree=?, experience=?, freelance_status=? WHERE id=1`,
      [title, description, birthday, phone, email, address, city, degree, experience, freelance_status]
    );
    auth.setFlash(req, 'success', 'About section updated successfully.');
    res.redirect('/admin/add_about');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update About section.');
  }
});

// Skills CRUD
app.get('/admin/add_skills', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM skills WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Skill deleted.');
    return res.redirect('/admin/add_skills');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM skills WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const skills = await db.query("SELECT * FROM skills ORDER BY category ASC, percentage DESC");
  res.render('admin/add_skills', { pageTitle: 'Skills', skills, editRow });
});

app.post('/admin/add_skills', async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const skill_name = (req.body.skill_name || '').trim();
  const percentage = Math.max(0, Math.min(100, parseInt(req.body.percentage || '0')));
  const category = (req.body.category || 'General').trim();

  if (!skill_name) {
    auth.setFlash(req, 'danger', 'Skill name is required.');
    return res.redirect('/admin/add_skills');
  }

  try {
    if (id > 0) {
      await db.query("UPDATE skills SET skill_name=?, percentage=?, category=? WHERE id=?", [skill_name, percentage, category, id]);
      auth.setFlash(req, 'success', 'Skill updated successfully.');
    } else {
      await db.query("INSERT INTO skills (skill_name, percentage, category) VALUES (?, ?, ?)", [skill_name, percentage, category]);
      auth.setFlash(req, 'success', 'Skill added successfully.');
    }
    res.redirect('/admin/add_skills');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Education CRUD
app.get('/admin/add_education', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM education WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Education entry deleted.');
    return res.redirect('/admin/add_education');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM education WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const education = await db.query("SELECT * FROM education ORDER BY start_year DESC, id DESC");
  res.render('admin/add_education', { pageTitle: 'Education', education, editRow });
});

app.post('/admin/add_education', async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const institute = (req.body.institute || '').trim();
  const degree = (req.body.degree || '').trim();
  const branch = (req.body.branch || '').trim();
  const start_year = (req.body.start_year || '').trim();
  const end_year = (req.body.end_year || '').trim();
  const cgpa = (req.body.cgpa || '').trim();
  const description = (req.body.description || '').trim();

  if (!institute || !degree) {
    auth.setFlash(req, 'danger', 'Institute and Degree are required.');
    return res.redirect('/admin/add_education');
  }

  try {
    if (id > 0) {
      await db.query(
        "UPDATE education SET institute=?, degree=?, branch=?, start_year=?, end_year=?, cgpa=?, description=? WHERE id=?",
        [institute, degree, branch, start_year, end_year, cgpa, description, id]
      );
      auth.setFlash(req, 'success', 'Education updated successfully.');
    } else {
      await db.query(
        "INSERT INTO education (institute, degree, branch, start_year, end_year, cgpa, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [institute, degree, branch, start_year, end_year, cgpa, description]
      );
      auth.setFlash(req, 'success', 'Education added successfully.');
    }
    res.redirect('/admin/add_education');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Experience CRUD
app.get('/admin/add_experience', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM experience WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Experience entry deleted.');
    return res.redirect('/admin/add_experience');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM experience WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const experience = await db.query("SELECT * FROM experience ORDER BY id DESC");
  res.render('admin/add_experience', { pageTitle: 'Experience', experience, editRow });
});

app.post('/admin/add_experience', async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const company = (req.body.company || '').trim();
  const position = (req.body.position || '').trim();
  const duration = (req.body.duration || '').trim();
  const description = (req.body.description || '').trim();

  if (!company || !position) {
    auth.setFlash(req, 'danger', 'Company and Position are required.');
    return res.redirect('/admin/add_experience');
  }

  try {
    if (id > 0) {
      await db.query("UPDATE experience SET company=?, position=?, duration=?, description=? WHERE id=?", [company, position, duration, description, id]);
      auth.setFlash(req, 'success', 'Experience updated successfully.');
    } else {
      await db.query("INSERT INTO experience (company, position, duration, description) VALUES (?, ?, ?, ?)", [company, position, duration, description]);
      auth.setFlash(req, 'success', 'Experience added successfully.');
    }
    res.redirect('/admin/add_experience');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Internships CRUD
app.get('/admin/add_internship', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM internships WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Internship entry deleted.');
    return res.redirect('/admin/add_internship');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM internships WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const internships = await db.query("SELECT * FROM internships ORDER BY id DESC");
  res.render('admin/add_internship', { pageTitle: 'Internships', internships, editRow });
});

app.post('/admin/add_internship', async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const company = (req.body.company || '').trim();
  const role = (req.body.role || '').trim();
  const duration = (req.body.duration || '').trim();
  const location = (req.body.location || '').trim();
  const description = (req.body.description || '').trim();
  const certificate_link = (req.body.certificate_link || '').trim();

  if (!company || !role) {
    auth.setFlash(req, 'danger', 'Company and Role are required.');
    return res.redirect('/admin/add_internship');
  }

  try {
    if (id > 0) {
      await db.query(
        "UPDATE internships SET company=?, role=?, duration=?, location=?, description=?, certificate_link=? WHERE id=?",
        [company, role, duration, location, description, certificate_link, id]
      );
      auth.setFlash(req, 'success', 'Internship updated successfully.');
    } else {
      await db.query(
        "INSERT INTO internships (company, role, duration, location, description, certificate_link) VALUES (?, ?, ?, ?, ?, ?)",
        [company, role, duration, location, description, certificate_link]
      );
      auth.setFlash(req, 'success', 'Internship added successfully.');
    }
    res.redirect('/admin/add_internship');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Projects CRUD
app.get('/admin/add_projects', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    const [proj] = await db.query("SELECT image FROM projects WHERE id=?", [deleteId]);
    if (proj) deleteOldFile('uploads/projects/', proj.image);

    await db.query("DELETE FROM projects WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Project deleted.');
    return res.redirect('/admin/add_projects');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM projects WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const projects = await db.query("SELECT * FROM projects ORDER BY id DESC");
  res.render('admin/add_projects', { pageTitle: 'Projects', projects, editRow });
});

app.post('/admin/add_projects', upload.single('image'), async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const technologies = (req.body.technologies || '').trim();
  const github_link = (req.body.github_link || '').trim();
  const live_link = (req.body.live_link || '').trim();
  const featured = req.body.featured ? 1 : 0;

  if (!title) {
    auth.setFlash(req, 'danger', 'Project title is required.');
    return res.redirect('/admin/add_projects');
  }

  try {
    let imageFilename = '';
    if (id > 0) {
      const [currentProj] = await db.query("SELECT image FROM projects WHERE id=?", [id]);
      imageFilename = currentProj ? currentProj.image : '';
    }

    if (req.file) {
      if (imageFilename) deleteOldFile('uploads/projects/', imageFilename);
      imageFilename = req.file.filename;
    }

    if (id > 0) {
      await db.query(
        "UPDATE projects SET title=?, description=?, technologies=?, github_link=?, live_link=?, image=?, featured=? WHERE id=?",
        [title, description, technologies, github_link, live_link, imageFilename, featured, id]
      );
      auth.setFlash(req, 'success', 'Project updated successfully.');
    } else {
      await db.query(
        "INSERT INTO projects (title, description, technologies, github_link, live_link, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title, description, technologies, github_link, live_link, imageFilename, featured]
      );
      auth.setFlash(req, 'success', 'Project added successfully.');
    }
    res.redirect('/admin/add_projects');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Certificates CRUD
app.get('/admin/add_certificates', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    const [cert] = await db.query("SELECT image FROM certificates WHERE id=?", [deleteId]);
    if (cert) deleteOldFile('uploads/certificates/', cert.image);

    await db.query("DELETE FROM certificates WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Certificate deleted.');
    return res.redirect('/admin/add_certificates');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM certificates WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const certificates = await db.query("SELECT * FROM certificates ORDER BY id DESC");
  res.render('admin/add_certificates', { pageTitle: 'Certificates', certificates, editRow });
});

app.post('/admin/add_certificates', upload.single('image'), async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const cert_name = (req.body.cert_name || '').trim();
  const organization = (req.body.organization || '').trim();
  const cert_date = (req.body.cert_date || '').trim();
  const cert_url = (req.body.cert_url || '').trim();

  if (!cert_name) {
    auth.setFlash(req, 'danger', 'Certificate name is required.');
    return res.redirect('/admin/add_certificates');
  }

  try {
    let imageFilename = '';
    if (id > 0) {
      const [currentCert] = await db.query("SELECT image FROM certificates WHERE id=?", [id]);
      imageFilename = currentCert ? currentCert.image : '';
    }

    if (req.file) {
      if (imageFilename) deleteOldFile('uploads/certificates/', imageFilename);
      imageFilename = req.file.filename;
    }

    if (id > 0) {
      await db.query(
        "UPDATE certificates SET cert_name=?, organization=?, cert_date=?, image=?, cert_url=? WHERE id=?",
        [cert_name, organization, cert_date, imageFilename, cert_url, id]
      );
      auth.setFlash(req, 'success', 'Certificate updated successfully.');
    } else {
      await db.query(
        "INSERT INTO certificates (cert_name, organization, cert_date, image, cert_url) VALUES (?, ?, ?, ?, ?)",
        [cert_name, organization, cert_date, imageFilename, cert_url]
      );
      auth.setFlash(req, 'success', 'Certificate added successfully.');
    }
    res.redirect('/admin/add_certificates');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Services CRUD
app.get('/admin/add_services', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM services WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Service deleted.');
    return res.redirect('/admin/add_services');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    const rows = await db.query("SELECT * FROM services WHERE id=?", [editId]);
    if (rows.length > 0) editRow = rows[0];
  }

  const services = await db.query("SELECT * FROM services ORDER BY id ASC");
  res.render('admin/add_services', { pageTitle: 'Services', services, editRow });
});

app.post('/admin/add_services', async (req, res) => {
  const id = parseInt(req.body.id || '0');
  const service_name = (req.body.service_name || '').trim();
  const icon = (req.body.icon || 'fa-solid fa-star').trim();
  const description = (req.body.description || '').trim();

  if (!service_name) {
    auth.setFlash(req, 'danger', 'Service name is required.');
    return res.redirect('/admin/add_services');
  }

  try {
    if (id > 0) {
      await db.query("UPDATE services SET service_name=?, icon=?, description=? WHERE id=?", [service_name, icon, description, id]);
      auth.setFlash(req, 'success', 'Service updated successfully.');
    } else {
      await db.query("INSERT INTO services (service_name, icon, description) VALUES (?, ?, ?)", [service_name, icon, description]);
      auth.setFlash(req, 'success', 'Service added successfully.');
    }
    res.redirect('/admin/add_services');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Contact Info CRUD
app.get('/admin/add_contact', async (req, res) => {
  const [contact] = await db.query("SELECT * FROM contact WHERE id=1");
  res.render('admin/add_contact', { pageTitle: 'Contact Info', contact: contact || {} });
});

app.post('/admin/add_contact', async (req, res) => {
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();
  const address = (req.body.address || '').trim();
  const map_link = (req.body.map_link || '').trim();

  try {
    await db.query("UPDATE contact SET phone=?, email=?, address=?, map_link=? WHERE id=1", [phone, email, address, map_link]);
    auth.setFlash(req, 'success', 'Contact information updated successfully.');
    res.redirect('/admin/add_contact');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Social Links CRUD
app.get('/admin/add_social', async (req, res) => {
  const [social] = await db.query("SELECT * FROM social WHERE id=1");
  res.render('admin/add_social', { pageTitle: 'Social Links', social: social || {} });
});

app.post('/admin/add_social', async (req, res) => {
  const github = (req.body.github || '').trim();
  const linkedin = (req.body.linkedin || '').trim();
  const instagram = (req.body.instagram || '').trim();
  const facebook = (req.body.facebook || '').trim();
  const twitter = (req.body.twitter || '').trim();
  const youtube = (req.body.youtube || '').trim();

  try {
    await db.query(
      "UPDATE social SET github=?, linkedin=?, instagram=?, facebook=?, twitter=?, youtube=? WHERE id=1",
      [github, linkedin, instagram, facebook, twitter, youtube]
    );
    auth.setFlash(req, 'success', 'Social links updated successfully.');
    res.redirect('/admin/add_social');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Messages Viewer
app.get('/admin/messages', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await db.query("DELETE FROM contact_messages WHERE id=?", [deleteId]);
    auth.setFlash(req, 'success', 'Message deleted.');
    return res.redirect('/admin/messages');
  }

  const markReadId = req.query.read;
  if (markReadId) {
    await db.query("UPDATE contact_messages SET is_read=1 WHERE id=?", [markReadId]);
    auth.setFlash(req, 'success', 'Message marked as read.');
    return res.redirect('/admin/messages');
  }

  const messages = await db.query("SELECT * FROM contact_messages ORDER BY created_at DESC");
  res.render('admin/messages', { pageTitle: 'Messages', messages });
});

// Settings & Site Branding
app.get('/admin/settings', async (req, res) => {
  const [settings] = await db.query("SELECT * FROM settings WHERE id=1");
  res.render('admin/settings', { pageTitle: 'Settings', settings: settings || {} });
});

app.post('/admin/settings', upload.fields([
  { name: 'website_logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
  const website_title = (req.body.website_title || '').trim();
  const footer_text = (req.body.footer_text || '').trim();
  const meta_desc = (req.body.meta_desc || '').trim();
  const meta_keywords = (req.body.meta_keywords || '').trim();

  try {
    const [currentSettings] = await db.query("SELECT website_logo, favicon FROM settings WHERE id=1");
    let website_logo = currentSettings ? currentSettings.website_logo : '';
    let favicon = currentSettings ? currentSettings.favicon : '';

    if (req.files.website_logo) {
      deleteOldFile('uploads/logo/', website_logo);
      website_logo = req.files.website_logo[0].filename;
    }
    if (req.files.favicon) {
      deleteOldFile('uploads/logo/', favicon);
      favicon = req.files.favicon[0].filename;
    }

    await db.query(
      "UPDATE settings SET website_title=?, footer_text=?, meta_desc=?, meta_keywords=?, website_logo=?, favicon=? WHERE id=1",
      [website_title, footer_text, meta_desc, meta_keywords, website_logo, favicon]
    );

    auth.setFlash(req, 'success', 'Site settings updated successfully.');
    res.redirect('/admin/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// Change Password
app.get('/admin/change_password', (req, res) => {
  res.render('admin/change_password', { pageTitle: 'Change Password' });
});

app.post('/admin/change_password', async (req, res) => {
  const current_password = req.body.current_password || '';
  const new_password = req.body.new_password || '';
  const confirm_password = req.body.confirm_password || '';

  if (!current_password || !new_password || !confirm_password) {
    auth.setFlash(req, 'danger', 'All fields are required.');
    return res.redirect('/admin/change_password');
  }

  if (new_password !== confirm_password) {
    auth.setFlash(req, 'danger', 'New passwords do not match.');
    return res.redirect('/admin/change_password');
  }

  try {
    const adminId = req.session.admin_id;
    // Check if the current user is in admin_users or users table
    let rows = await db.query("SELECT password FROM admin_users WHERE id = ? LIMIT 1", [adminId]);
    let isUserTable = false;
    if (rows.length === 0) {
      rows = await db.query("SELECT password_hash AS password FROM users WHERE id = ? LIMIT 1", [adminId]);
      isUserTable = true;
    }

    if (rows.length === 1) {
      const currentHash = rows[0].password;
      if (await bcrypt.compare(current_password, currentHash)) {
        const newHash = await bcrypt.hash(new_password, 10);
        if (isUserTable) {
          await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, adminId]);
        } else {
          await db.query("UPDATE admin_users SET password = ? WHERE id = ?", [newHash, adminId]);
        }
        auth.setFlash(req, 'success', 'Password updated successfully.');
      } else {
        auth.setFlash(req, 'danger', 'Incorrect current password.');
      }
    } else {
      auth.setFlash(req, 'danger', 'User not found.');
    }
    res.redirect('/admin/change_password');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});


// Start server after initializing the database
db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:3000/admin/login`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
