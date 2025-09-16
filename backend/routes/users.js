const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Login route
router.post('/login', userController.login);

// Get all admin users
router.get('/admin', userController.getAdminUsers);

// Get all users
router.get('/', userController.getAllUsers);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Get user by ID
router.get('/:id', userController.getUserById);

// Create new user
router.post('/', userController.createUser);

// Update user
router.put('/:id', userController.updateUser);

// Update password
router.put('/:id/password', userController.updatePassword);

// Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router; 