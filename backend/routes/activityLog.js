const express = require('express');
const router = express.Router();
const { 
  getRecentActivities, 
  getActivitiesByRole, 
  manualCleanup 
} = require('../controllers/activityLogController');

// Get all recent activities
router.get('/recent', getRecentActivities);

// Get activities by role (guru, siswa, admin)
router.get('/role/:role', getActivitiesByRole);

// Manual cleanup endpoint (admin only)
router.delete('/cleanup', manualCleanup);

module.exports = router; 