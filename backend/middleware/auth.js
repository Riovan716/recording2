const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware untuk verifikasi JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('Auth header:', authHeader);
  console.log('Token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('User authenticated:', user);
    req.user = user;
    next();
  });
};

// Middleware untuk verifikasi admin role
const requireAdmin = (req, res, next) => {
  console.log('Checking admin role for user:', req.user);
  if (req.user.role !== 'admin') {
    console.log('User role is not admin:', req.user.role);
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('Admin access granted');
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
