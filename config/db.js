/**
 * config/db.js
 * MongoDB Atlas connection using Mongoose.
 * Exports models for all portfolio entities.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anuja:anuja123@pharmacycluster.ixcqnmj.mongodb.net/portfolioDB?retryWrites=true&w=majority&appName=PharmacyCluster';

// Disable operation buffering so queries fail fast when not connected
mongoose.set('bufferCommands', false);

// ─── SCHEMAS ────────────────────────────────────────────────────────────────

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Administrator' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const SettingsSchema = new mongoose.Schema({
  website_title: { type: String, default: 'My Portfolio' },
  website_logo: { type: String, default: '' },
  favicon: { type: String, default: '' },
  footer_text: { type: String, default: 'All Rights Reserved.' },
  meta_desc: { type: String, default: 'Welcome to my professional portfolio website.' },
  meta_keywords: { type: String, default: '' },
  show_hero: { type: Number, default: 1 },
  show_about: { type: Number, default: 1 },
  show_skills: { type: Number, default: 1 },
  show_education: { type: Number, default: 1 },
  show_experience: { type: Number, default: 1 },
  show_internship: { type: Number, default: 1 },
  show_projects: { type: Number, default: 1 },
  show_certificates: { type: Number, default: 1 },
  show_services: { type: Number, default: 1 },
  show_contact: { type: Number, default: 1 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const HeroSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  profession: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  short_description: { type: String, default: '' },
  resume: { type: String, default: '' },
  profile_photo: { type: String, default: '' },
  background_image: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const AboutSchema = new mongoose.Schema({
  title: { type: String, default: 'About Me' },
  description: { type: String, default: '' },
  birthday: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  degree: { type: String, default: '' },
  experience: { type: String, default: '' },
  freelance_status: { type: String, default: 'Available' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const SkillSchema = new mongoose.Schema({
  skill_name: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  category: { type: String, default: 'General' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const EducationSchema = new mongoose.Schema({
  institute: { type: String, required: true },
  degree: { type: String, required: true },
  branch: { type: String, default: '' },
  start_year: { type: String, default: '' },
  end_year: { type: String, default: '' },
  cgpa: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ExperienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  position: { type: String, required: true },
  duration: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const InternshipSchema = new mongoose.Schema({
  company: { type: String, required: true },
  role: { type: String, required: true },
  duration: { type: String, default: '' },
  location: { type: String, default: '' },
  description: { type: String, default: '' },
  certificate_link: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  technologies: { type: String, default: '' },
  github_link: { type: String, default: '' },
  live_link: { type: String, default: '' },
  image: { type: String, default: '' },
  featured: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const CertificateSchema = new mongoose.Schema({
  cert_name: { type: String, required: true },
  organization: { type: String, default: '' },
  cert_date: { type: String, default: '' },
  image: { type: String, default: '' },
  cert_url: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ServiceSchema = new mongoose.Schema({
  service_name: { type: String, required: true },
  icon: { type: String, default: 'fa-solid fa-star' },
  description: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ContactSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  map_link: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const SocialSchema = new mongoose.Schema({
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  instagram: { type: String, default: '' },
  facebook: { type: String, default: '' },
  twitter: { type: String, default: '' },
  youtube: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ContactMessageSchema = new mongoose.Schema({
  sender_name: { type: String, required: true },
  sender_email: { type: String, required: true },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  is_read: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// ─── MODELS ─────────────────────────────────────────────────────────────────

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
const User = mongoose.model('User', UserSchema);
const Settings = mongoose.model('Settings', SettingsSchema);
const Hero = mongoose.model('Hero', HeroSchema);
const About = mongoose.model('About', AboutSchema);
const Skill = mongoose.model('Skill', SkillSchema);
const Education = mongoose.model('Education', EducationSchema);
const Experience = mongoose.model('Experience', ExperienceSchema);
const Internship = mongoose.model('Internship', InternshipSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Certificate = mongoose.model('Certificate', CertificateSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const Social = mongoose.model('Social', SocialSchema);
const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema);

let isConnected = false;

async function initDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('Connected to MongoDB Atlas PharmacyCluster successfully.');

    // Seed default admin if none exists
    const adminCount = await AdminUser.countDocuments();
    if (adminCount === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await AdminUser.create({ username: 'admin', password: hash, name: 'Administrator' });
      console.log('Seeded default admin user (admin / admin123).');
    }

    // Seed singleton documents if not exist
    if ((await Settings.countDocuments()) === 0) {
      await Settings.create({ website_title: 'My Portfolio', footer_text: 'All Rights Reserved.' });
    }
    if ((await Hero.countDocuments()) === 0) {
      await Hero.create({ name: '', profession: '', subtitle: '', short_description: '' });
    }
    if ((await About.countDocuments()) === 0) {
      await About.create({ title: 'About Me', description: '' });
    }
    if ((await Contact.countDocuments()) === 0) {
      await Contact.create({ phone: '', email: '', address: '' });
    }
    if ((await Social.countDocuments()) === 0) {
      await Social.create({});
    }
  } catch (err) {
    isConnected = false;
    console.error('\n⚠️ MongoDB Atlas Connection Notice:');
    console.error('--------------------------------------------------');
    console.error(err.message);
    if (err.message.includes('whitelisted') || err.message.includes('buffering timed out') || err.message.includes('Server selection timed out')) {
      console.error('\n👉 ACTION REQUIRED IN MONGODB ATLAS:');
      console.error('1. Open https://cloud.mongodb.com');
      console.error('2. Go to "Network Access" under Security.');
      console.error('3. Click "Add IP Address" and choose "Allow Access From Anywhere" (0.0.0.0/0).');
      console.error('4. Click "Confirm".\n');
    }
    console.error('--------------------------------------------------\n');
  }
}

module.exports = {
  initDatabase,
  getIsConnected: () => isConnected,
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
};
