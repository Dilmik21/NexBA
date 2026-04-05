const express = require('express');
const router = express.Router();
const devController = require('../controllers/devController');

const auth = (req, res, next) => {
  req.uid = req.query.uid || req.headers['x-user-uid'] || req.body.uid;
  if (!req.uid) return res.status(401).json({ success: false, message: "Unauthorized" });
  next();
};

// Dashboard & Core
router.get('/dashboard', auth, devController.getDashboardData);
router.get('/search', auth, devController.searchRequirements);
router.get('/tasks', auth, devController.getMyTasksPageData);

// Performance Page
router.get('/performance', auth, devController.getPerformanceData);

// Status Updates
router.put('/tasks/status', auth, devController.updateTaskStatus);
router.put('/requirements/status', auth, devController.updateRequirementStatus); 

// Communication Hub
router.get('/chats', auth, devController.getChatList);
router.get('/messages/:reqId', auth, devController.getMessages);
router.post('/messages', auth, devController.sendMessage);

// Evidence Submissions
router.get('/evidence', auth, devController.getPendingSubmissions);
router.post('/evidence/:reqId/submit', auth, devController.submitRequirementEvidence);

// --- SETTINGS AND NOTIFICATIONS ---
router.get('/settings', auth, devController.getSettings);
router.put('/settings/general', auth, devController.updateGeneralSettings);
router.put('/settings/security', auth, devController.updateSecuritySettings);
router.put('/settings/notifications', auth, devController.updateNotificationSettings);
router.get('/notifications', auth, devController.getNotifications);
router.put('/notifications/read', auth, devController.markNotificationsRead);

module.exports = router;