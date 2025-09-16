const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/login', userController.login);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// Admin-only routes (authentication + admin role required)
router.get('/admin', authenticateToken, requireAdmin, userController.getAdminUsers);
router.get('/', authenticateToken, requireAdmin, userController.getAllUsers);
router.get('/:id', authenticateToken, requireAdmin, userController.getUserById);
router.post('/', authenticateToken, requireAdmin, userController.createUser);
router.put('/:id', authenticateToken, requireAdmin, userController.updateUser);
router.put('/:id/password', authenticateToken, requireAdmin, userController.updatePassword);
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router; 