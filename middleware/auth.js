/**
 * middleware/auth.js
 * Authentication, CSRF protection, and helper middlewares.
 */
const crypto = require('crypto');

// Middleware to inject flash message and session variables into templates
function localsMiddleware(req, res, next) {
  // CSRF Token generation
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Flash messages helper
  res.locals.flash = req.session.flash || null;
  req.session.flash = null; // Clear flash after reading

  // Helper function for HTML escaping in templates (similar to e() in PHP)
  res.locals.e = (val) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Logged-in admin session details
  res.locals.admin = req.session.admin_id ? {
    id: req.session.admin_id,
    name: req.session.admin_name,
    user: req.session.admin_user
  } : null;

  // Root BASE_URL helper equivalent
  res.locals.BASE_URL = ''; // Express uses relative paths, or we can use empty prefix

  next();
}

// Ensure the user is logged in to access admin pages
function requireLogin(req, res, next) {
  if (!req.session.admin_id) {
    req.session.flash = { type: 'danger', msg: 'Please log in to access this page.' };
    return res.redirect('/login');
  }
  next();
}

// Redirect if already logged in (e.g. login page)
function requireNoLogin(req, res, next) {
  if (req.session.admin_id) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

// Validate CSRF token for POST requests
function verifyCsrf(req, res, next) {
  if (req.method === 'POST') {
    const token = req.body.csrf_token || req.headers['x-csrf-token'] || req.query.csrf_token;
    if (!token || token !== req.session.csrfToken) {
      res.status(403);
      return res.send('<p style="color:red;font-family:sans-serif;padding:20px;">403 – CSRF token mismatch. Go back and try again.</p>');
    }
  }
  next();
}

// Helper to set a flash message
function setFlash(req, type, msg) {
  req.session.flash = { type, msg };
}

module.exports = {
  localsMiddleware,
  requireLogin,
  requireNoLogin,
  verifyCsrf,
  setFlash
};
