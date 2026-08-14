/**
 * server.js
 * Main entrypoint for the Node.js / Express Portfolio Application using MongoDB Atlas.
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const {
  initDatabase,
  AdminUser,
  User,
  Settings,
  Hero,
  About,
  Skill,
  Education,
  Experience,
  Internship,
  Project,
  Certificate,
  Service,
  Contact,
  Social,
  ContactMessage
} = require('./config/db');

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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
    const settings = (await Settings.findOne()) || {};
    const hero = (await Hero.findOne()) || {};
    const about = (await About.findOne()) || {};
    const contact = (await Contact.findOne()) || {};
    const social = (await Social.findOne()) || {};

    const skills = await Skill.find().sort({ percentage: -1, _id: 1 });
    const education = await Education.find().sort({ start_year: -1, _id: -1 });
    const experience = await Experience.find().sort({ _id: -1 });
    const internships = await Internship.find().sort({ _id: -1 });
    const projects = await Project.find().sort({ featured: -1, _id: -1 });
    const certificates = await Certificate.find().sort({ _id: -1 });
    const services = await Service.find().sort({ _id: 1 });

    const totalProj = projects.length;
    const totalCerts = certificates.length;

    res.render('index', {
      settings,
      hero,
      about,
      contact,
      social,
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
    console.error('Database query notice:', err.message);
    res.render('index', {
      settings: { website_title: 'My Portfolio' },
      hero: {},
      about: {},
      contact: {},
      social: {},
      skills: [],
      education: [],
      experience: [],
      internships: [],
      projects: [],
      certificates: [],
      services: [],
      totalProj: 0,
      totalCerts: 0
    });
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.json({ success: false, msg: 'Invalid email address.' });
  }

  try {
    await ContactMessage.create({
      sender_name: name,
      sender_email: email,
      subject,
      message
    });
    res.json({ success: true, msg: 'Your message has been sent successfully!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, msg: 'Failed to save message. Please ensure MongoDB Atlas IP is whitelisted.' });
  }
});

// ─── LOGIN & REGISTER ROUTES ──────────────────────────────────────────────

// GET Login
app.get('/login', auth.requireNoLogin, async (req, res) => {
  try {
    const settings = (await Settings.findOne()) || {};
    res.render('login', { settings, error: '' });
  } catch (err) {
    res.render('login', { settings: {}, error: '' });
  }
});

// POST Login
app.post('/login', auth.requireNoLogin, async (req, res) => {
  const identifier = (req.body.username || '').trim();
  const password = req.body.password || '';
  const settings = (await Settings.findOne()) || {};

  if (!identifier || !password) {
    return res.render('login', { settings, error: 'Please enter both username/email and password.' });
  }

  try {
    // 1. Check AdminUser collection
    const admin = await AdminUser.findOne({ username: new RegExp(`^${identifier}$`, 'i') });
    if (admin) {
      if (await bcrypt.compare(password, admin.password)) {
        req.session.admin_id = admin._id.toString();
        req.session.admin_name = admin.name;
        req.session.admin_user = admin.username;
        auth.setFlash(req, 'success', `Welcome back, ${admin.name}!`);
        return res.redirect('/admin/dashboard');
      }
    }

    // 2. Check User collection
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { name: new RegExp(`^${identifier}$`, 'i') }
      ]
    });
    if (user) {
      if (await bcrypt.compare(password, user.password_hash)) {
        req.session.admin_id = user._id.toString();
        req.session.admin_name = user.name;
        req.session.admin_user = user.email;
        auth.setFlash(req, 'success', `Welcome back, ${user.name}!`);
        return res.redirect('/admin/dashboard');
      }
    }

    res.render('login', { settings, error: 'Invalid username/email or password.' });
  } catch (err) {
    console.error(err);
    res.render('login', { settings, error: 'An error occurred. Please try again.' });
  }
});

// GET Register
app.get('/register', auth.requireNoLogin, async (req, res) => {
  try {
    const settings = (await Settings.findOne()) || {};
    res.render('register', { settings, errors: {}, success: false, name: '', email: '' });
  } catch (err) {
    res.render('register', { settings: {}, errors: {}, success: false, name: '', email: '' });
  }
});

// POST Register
app.post('/register', auth.requireNoLogin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const confirm_password = req.body.confirm_password || '';
  const settings = (await Settings.findOne()) || {};

  const errors = {};
  if (!name) errors.name = 'Please enter your full name.';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!email) errors.email = 'Please enter your email address.';
  else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.email = 'Please enter a valid email address.';
    else {
      const existing = await User.findOne({ email });
      if (existing) errors.email = 'This email is already registered.';
    }
  }

  if (!password) errors.password = 'Please enter a password.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

  if (!confirm_password) errors.confirm_password = 'Please confirm your password.';
  else if (password !== confirm_password) errors.confirm_password = 'Passwords do not match.';

  if (Object.keys(errors).length > 0) {
    return res.render('register', { settings, errors, success: false, name, email });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await User.create({ name, email, password_hash: hash });
    res.render('register', { settings, errors: {}, success: true, name: '', email: '' });
  } catch (err) {
    console.error(err);
    res.render('register', { settings, errors: { general: 'Failed to register. Try again.' }, success: false, name, email });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ─── ADMIN DASHBOARD & CRUD ROUTES ────────────────────────────────────────

app.use('/admin', auth.requireLogin);

// Admin Dashboard
app.get('/admin/dashboard', async (req, res) => {
  const [skills, projects, certificates, education, experience, internships, settings] = await Promise.all([
    Skill.countDocuments(),
    Project.countDocuments(),
    Certificate.countDocuments(),
    Education.countDocuments(),
    Experience.countDocuments(),
    Internship.countDocuments(),
    Settings.findOne()
  ]);

  const stats = { skills, projects, certificates, education, experience, internships };
  res.render('admin/dashboard', { pageTitle: 'Dashboard', stats, settings: settings || {} });
});

// Section Visibility Manager Update
app.post('/admin/dashboard', async (req, res) => {
  if (req.body.update_dashboard_sections || req.body.update_sections) {
    await Settings.findOneAndUpdate({}, {
      show_hero: req.body.show_hero ? 1 : 0,
      show_about: req.body.show_about ? 1 : 0,
      show_skills: req.body.show_skills ? 1 : 0,
      show_education: req.body.show_education ? 1 : 0,
      show_experience: req.body.show_experience ? 1 : 0,
      show_internship: req.body.show_internship ? 1 : 0,
      show_projects: req.body.show_projects ? 1 : 0,
      show_certificates: req.body.show_certificates ? 1 : 0,
      show_services: req.body.show_services ? 1 : 0,
      show_contact: req.body.show_contact ? 1 : 0
    }, { upsert: true });

    auth.setFlash(req, 'success', 'Section visibility settings updated successfully.');
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/dashboard');
});

// Hero Section
app.get('/admin/add_hero', async (req, res) => {
  const hero = (await Hero.findOne()) || {};
  res.render('admin/add_hero', { pageTitle: 'Hero Section', hero });
});

app.post('/admin/add_hero', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'background_image', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), async (req, res) => {
  const hero = (await Hero.findOne()) || new Hero({});
  const name = (req.body.name || '').trim();
  const profession = (req.body.profession || '').trim();
  const subtitle = (req.body.subtitle || '').trim();
  const short_description = (req.body.short_description || '').trim();

  let profile_photo = hero.profile_photo;
  if (req.files && req.files['profile_photo']) {
    deleteOldFile('uploads/profile', profile_photo);
    profile_photo = req.files['profile_photo'][0].filename;
  }

  let background_image = hero.background_image;
  if (req.files && req.files['background_image']) {
    deleteOldFile('uploads/profile', background_image);
    background_image = req.files['background_image'][0].filename;
  }

  let resume = hero.resume;
  if (req.files && req.files['resume']) {
    deleteOldFile('uploads/resumes', resume);
    resume = req.files['resume'][0].filename;
  }

  hero.name = name;
  hero.profession = profession;
  hero.subtitle = subtitle;
  hero.short_description = short_description;
  hero.profile_photo = profile_photo;
  hero.background_image = background_image;
  hero.resume = resume;
  await hero.save();

  auth.setFlash(req, 'success', 'Hero section updated successfully.');
  res.redirect('/admin/add_hero');
});

// About Section
app.get('/admin/add_about', async (req, res) => {
  const about = (await About.findOne()) || {};
  res.render('admin/add_about', { pageTitle: 'About Section', about });
});

app.post('/admin/add_about', async (req, res) => {
  const { title, description, birthday, phone, email, address, city, degree, experience, freelance_status } = req.body;
  await About.findOneAndUpdate({}, {
    title: (title || '').trim(),
    description: (description || '').trim(),
    birthday: (birthday || '').trim(),
    phone: (phone || '').trim(),
    email: (email || '').trim(),
    address: (address || '').trim(),
    city: (city || '').trim(),
    degree: (degree || '').trim(),
    experience: (experience || '').trim(),
    freelance_status: freelance_status || 'Available'
  }, { upsert: true });

  auth.setFlash(req, 'success', 'About section updated successfully.');
  res.redirect('/admin/add_about');
});

// Skills Section
app.get('/admin/add_skills', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await Skill.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Skill deleted successfully.');
    return res.redirect('/admin/add_skills');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Skill.findById(editId);
  }

  const skills = (await Skill.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_skills', { pageTitle: 'Skills', skills, editRow: editRowObj });
});

app.post('/admin/add_skills', async (req, res) => {
  const id = req.body.id;
  const skill_name = (req.body.skill_name || '').trim();
  const percentage = parseInt(req.body.percentage) || 0;
  const category = (req.body.category || '').trim();

  if (id && id !== '0') {
    await Skill.findByIdAndUpdate(id, { skill_name, percentage, category });
    auth.setFlash(req, 'success', 'Skill updated successfully.');
  } else {
    await Skill.create({ skill_name, percentage, category });
    auth.setFlash(req, 'success', 'Skill added successfully.');
  }
  res.redirect('/admin/add_skills');
});

// Education Section
app.get('/admin/add_education', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await Education.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Education record deleted.');
    return res.redirect('/admin/add_education');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Education.findById(editId);
  }

  const education = (await Education.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_education', { pageTitle: 'Education', education, editRow: editRowObj });
});

app.post('/admin/add_education', async (req, res) => {
  const id = req.body.id;
  const { institute, degree, branch, start_year, end_year, cgpa, description } = req.body;
  const payload = {
    institute: (institute || '').trim(),
    degree: (degree || '').trim(),
    branch: (branch || '').trim(),
    start_year: (start_year || '').trim(),
    end_year: (end_year || '').trim(),
    cgpa: (cgpa || '').trim(),
    description: (description || '').trim()
  };

  if (id && id !== '0') {
    await Education.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Education record updated.');
  } else {
    await Education.create(payload);
    auth.setFlash(req, 'success', 'Education record added.');
  }
  res.redirect('/admin/add_education');
});

// Experience Section
app.get('/admin/add_experience', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await Experience.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Experience record deleted.');
    return res.redirect('/admin/add_experience');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Experience.findById(editId);
  }

  const experience = (await Experience.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_experience', { pageTitle: 'Experience', experience, editRow: editRowObj });
});

app.post('/admin/add_experience', async (req, res) => {
  const id = req.body.id;
  const { company, position, duration, description } = req.body;
  const payload = {
    company: (company || '').trim(),
    position: (position || '').trim(),
    duration: (duration || '').trim(),
    description: (description || '').trim()
  };

  if (id && id !== '0') {
    await Experience.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Experience record updated.');
  } else {
    await Experience.create(payload);
    auth.setFlash(req, 'success', 'Experience record added.');
  }
  res.redirect('/admin/add_experience');
});

// Internships Section
app.get('/admin/add_internship', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await Internship.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Internship record deleted.');
    return res.redirect('/admin/add_internship');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Internship.findById(editId);
  }

  const internships = (await Internship.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_internship', { pageTitle: 'Internships', internships, editRow: editRowObj });
});

app.post('/admin/add_internship', async (req, res) => {
  const id = req.body.id;
  const { company, role, duration, location, description, certificate_link } = req.body;
  const payload = {
    company: (company || '').trim(),
    role: (role || '').trim(),
    duration: (duration || '').trim(),
    location: (location || '').trim(),
    description: (description || '').trim(),
    certificate_link: (certificate_link || '').trim()
  };

  if (id && id !== '0') {
    await Internship.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Internship record updated.');
  } else {
    await Internship.create(payload);
    auth.setFlash(req, 'success', 'Internship record added.');
  }
  res.redirect('/admin/add_internship');
});

// Projects Section
app.get('/admin/add_projects', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    const proj = await Project.findById(deleteId);
    if (proj && proj.image) {
      deleteOldFile('uploads/projects', proj.image);
    }
    await Project.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Project deleted successfully.');
    return res.redirect('/admin/add_projects');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Project.findById(editId);
  }

  const projects = (await Project.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_projects', { pageTitle: 'Projects', projects, editRow: editRowObj });
});

app.post('/admin/add_projects', upload.single('image'), async (req, res) => {
  const id = req.body.id;
  const { title, description, technologies, github_link, live_link } = req.body;
  const featured = req.body.featured ? 1 : 0;

  let image = '';
  if (id && id !== '0') {
    const existing = await Project.findById(id);
    if (existing) image = existing.image;
  }

  if (req.file) {
    if (image) deleteOldFile('uploads/projects', image);
    image = req.file.filename;
  }

  const payload = {
    title: (title || '').trim(),
    description: (description || '').trim(),
    technologies: (technologies || '').trim(),
    github_link: (github_link || '').trim(),
    live_link: (live_link || '').trim(),
    image,
    featured
  };

  if (id && id !== '0') {
    await Project.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Project updated successfully.');
  } else {
    await Project.create(payload);
    auth.setFlash(req, 'success', 'Project added successfully.');
  }
  res.redirect('/admin/add_projects');
});

// Certificates Section
app.get('/admin/add_certificates', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    const cert = await Certificate.findById(deleteId);
    if (cert && cert.image) {
      deleteOldFile('uploads/certificates', cert.image);
    }
    await Certificate.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Certificate deleted.');
    return res.redirect('/admin/add_certificates');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Certificate.findById(editId);
  }

  const certificates = (await Certificate.find().sort({ _id: -1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_certificates', { pageTitle: 'Certificates', certificates, editRow: editRowObj });
});

app.post('/admin/add_certificates', upload.single('image'), async (req, res) => {
  const id = req.body.id;
  const { cert_name, organization, cert_date, cert_url } = req.body;

  let image = '';
  if (id && id !== '0') {
    const existing = await Certificate.findById(id);
    if (existing) image = existing.image;
  }

  if (req.file) {
    if (image) deleteOldFile('uploads/certificates', image);
    image = req.file.filename;
  }

  const payload = {
    cert_name: (cert_name || '').trim(),
    organization: (organization || '').trim(),
    cert_date: (cert_date || '').trim(),
    cert_url: (cert_url || '').trim(),
    image
  };

  if (id && id !== '0') {
    await Certificate.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Certificate updated.');
  } else {
    await Certificate.create(payload);
    auth.setFlash(req, 'success', 'Certificate added.');
  }
  res.redirect('/admin/add_certificates');
});

// Services Section
app.get('/admin/add_services', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await Service.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Service deleted.');
    return res.redirect('/admin/add_services');
  }

  const editId = req.query.edit;
  let editRow = null;
  if (editId) {
    editRow = await Service.findById(editId);
  }

  const services = (await Service.find().sort({ _id: 1 })).map(r => ({ ...r.toObject(), id: r._id.toString() }));
  const editRowObj = editRow ? { ...editRow.toObject(), id: editRow._id.toString() } : null;
  res.render('admin/add_services', { pageTitle: 'Services', services, editRow: editRowObj });
});

app.post('/admin/add_services', async (req, res) => {
  const id = req.body.id;
  const { service_name, icon, description } = req.body;
  const payload = {
    service_name: (service_name || '').trim(),
    icon: (icon || 'fa-solid fa-star').trim(),
    description: (description || '').trim()
  };

  if (id && id !== '0') {
    await Service.findByIdAndUpdate(id, payload);
    auth.setFlash(req, 'success', 'Service updated.');
  } else {
    await Service.create(payload);
    auth.setFlash(req, 'success', 'Service added.');
  }
  res.redirect('/admin/add_services');
});

// Contact Info Section
app.get('/admin/add_contact', async (req, res) => {
  const contact = (await Contact.findOne()) || {};
  res.render('admin/add_contact', { pageTitle: 'Contact Info', contact });
});

app.post('/admin/add_contact', async (req, res) => {
  const { phone, email, address, map_link } = req.body;
  await Contact.findOneAndUpdate({}, {
    phone: (phone || '').trim(),
    email: (email || '').trim(),
    address: (address || '').trim(),
    map_link: (map_link || '').trim()
  }, { upsert: true });

  auth.setFlash(req, 'success', 'Contact info updated successfully.');
  res.redirect('/admin/add_contact');
});

// Social Links Section
app.get('/admin/add_social', async (req, res) => {
  const social = (await Social.findOne()) || {};
  res.render('admin/add_social', { pageTitle: 'Social Links', social });
});

app.post('/admin/add_social', async (req, res) => {
  const { github, linkedin, instagram, facebook, twitter, youtube } = req.body;
  await Social.findOneAndUpdate({}, {
    github: (github || '').trim(),
    linkedin: (linkedin || '').trim(),
    instagram: (instagram || '').trim(),
    facebook: (facebook || '').trim(),
    twitter: (twitter || '').trim(),
    youtube: (youtube || '').trim()
  }, { upsert: true });

  auth.setFlash(req, 'success', 'Social links updated.');
  res.redirect('/admin/add_social');
});

// Messages Section
app.get('/admin/messages', async (req, res) => {
  const deleteId = req.query.delete;
  if (deleteId) {
    await ContactMessage.findByIdAndDelete(deleteId);
    auth.setFlash(req, 'success', 'Message deleted.');
    return res.redirect('/admin/messages');
  }

  const markReadId = req.query.read;
  if (markReadId) {
    await ContactMessage.findByIdAndUpdate(markReadId, { is_read: 1 });
    auth.setFlash(req, 'success', 'Message marked as read.');
    return res.redirect('/admin/messages');
  }

  const messages = (await ContactMessage.find().sort({ created_at: -1 })).map(m => ({ ...m.toObject(), id: m._id.toString() }));
  res.render('admin/messages', { pageTitle: 'Messages', messages });
});

// Settings & Site Branding
app.get('/admin/settings', async (req, res) => {
  const settings = (await Settings.findOne()) || {};
  res.render('admin/settings', { pageTitle: 'Settings', settings });
});

app.post('/admin/settings', upload.fields([
  { name: 'website_logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
  const settings = (await Settings.findOne()) || new Settings({});
  const { website_title, footer_text, meta_desc, meta_keywords } = req.body;

  let website_logo = settings.website_logo;
  if (req.files && req.files['website_logo']) {
    deleteOldFile('uploads/logo', website_logo);
    website_logo = req.files['website_logo'][0].filename;
  }

  let favicon = settings.favicon;
  if (req.files && req.files['favicon']) {
    deleteOldFile('uploads/logo', favicon);
    favicon = req.files['favicon'][0].filename;
  }

  settings.website_title = (website_title || '').trim();
  settings.footer_text = (footer_text || '').trim();
  settings.meta_desc = (meta_desc || '').trim();
  settings.meta_keywords = (meta_keywords || '').trim();
  settings.website_logo = website_logo;
  settings.favicon = favicon;
  await settings.save();

  auth.setFlash(req, 'success', 'Settings updated successfully.');
  res.redirect('/admin/settings');
});

// Change Password
app.post('/admin/change_password', async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const adminId = req.session.admin_id;

  if (!current_password || !new_password || !confirm_password) {
    auth.setFlash(req, 'error', 'All password fields are required.');
    return res.redirect('/admin/settings');
  }

  if (new_password !== confirm_password) {
    auth.setFlash(req, 'error', 'New passwords do not match.');
    return res.redirect('/admin/settings');
  }

  if (new_password.length < 6) {
    auth.setFlash(req, 'error', 'Password must be at least 6 characters long.');
    return res.redirect('/admin/settings');
  }

  try {
    // Check in AdminUser or User collection
    let account = await AdminUser.findById(adminId);
    let isStandardUser = false;
    if (!account) {
      account = await User.findById(adminId);
      isStandardUser = true;
    }

    if (!account) {
      auth.setFlash(req, 'error', 'Account not found.');
      return res.redirect('/admin/settings');
    }

    const currentHash = isStandardUser ? account.password_hash : account.password;
    const match = await bcrypt.compare(current_password, currentHash);
    if (!match) {
      auth.setFlash(req, 'error', 'Current password is incorrect.');
      return res.redirect('/admin/settings');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    if (isStandardUser) {
      account.password_hash = newHash;
    } else {
      account.password = newHash;
    }
    await account.save();

    auth.setFlash(req, 'success', 'Password updated successfully!');
    res.redirect('/admin/settings');
  } catch (err) {
    console.error(err);
    auth.setFlash(req, 'error', 'An error occurred while changing password.');
    res.redirect('/admin/settings');
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('login', {
    settings: {},
    error: '404 - Page not found.'
  });
});

// Start Express Server & Connect Database
app.listen(PORT, async () => {
  console.log(`🌐 Public Portfolio Website: http://localhost:${PORT}`);
  console.log(`🔑 Admin Login Page: http://localhost:${PORT}/login`);
  await initDatabase();
});
