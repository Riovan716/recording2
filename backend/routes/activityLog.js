const express = require('express');
const router = express.Router();
const { 
  getRecentActivities, 
  getActivitiesByRole, 
  manualCleanup 
} = require('../controllers/activityLogController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protected routes (authentication required)
router.get('/recent', authenticateToken, requireAdmin, getRecentActivities);
router.get('/role/:role', authenticateToken, requireAdmin, getActivitiesByRole);
router.delete('/cleanup', authenticateToken, requireAdmin, manualCleanup);

module.exports = router; 