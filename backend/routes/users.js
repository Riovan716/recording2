const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Public routes (no authentication required)
router.post('/login', userController.login);

// All routes are now public (no authentication required)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/admin', userController.getAdminUsers);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.put('/:id/password', userController.updatePassword);
router.delete('/:id', userController.deleteUser);

module.exports = router; 