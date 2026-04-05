const express = require('express');
const router = express.Router();
const clientController = require('../controllers/ClientController');

// Ensure the middleware is applied to ALL routes
const auth = clientController.requireUid;

// Projects & Dashboard
router.post('/projects', auth, clientController.submitProject);
router.get('/overview-stats', auth, clientController.getOverviewStats);
router.get('/project-progress', auth, clientController.getProjectProgress);
router.get('/change-requests', auth, clientController.getChangeRequests);
router.get('/action-items', auth, clientController.getActionItems);
router.get('/recent-activity', auth, clientController.getRecentActivity);
router.get('/search', auth, clientController.searchRequirements);
router.get('/requests', auth, clientController.getAllRequests);

// Clarifications
router.get('/clarifications', auth, clientController.getClarifications);
// 🚨 FIXED: Now correctly points to the Client Controller! 🚨
router.post('/clarifications/:id/answer', auth, clientController.answerClarification);

// Communication Hub
router.get('/chat/projects', auth, clientController.getChatProjects);
router.get('/chat/:reqId', auth, clientController.getProjectMessages);
router.post('/chat/:reqId', auth, clientController.sendProjectMessage);
router.put('/chat/:reqId/read', auth, clientController.markProjectMessagesRead); 

// Approvals & Archive
router.get('/approvals', auth, clientController.getApprovals);
router.post('/approvals/:id/approve', auth, clientController.approveRequirement);
router.post('/approvals/:id/request-change', auth, clientController.requestChangeForRequirement);
router.get('/archive', auth, clientController.getArchivedRequirements);

// Profile, Settings & Notifications
router.get('/settings', auth, clientController.getSettings);
router.put('/settings/general', auth, clientController.updateGeneralSettings);
router.put('/settings/security', auth, clientController.updateSecuritySettings);
router.put('/settings/notifications', auth, clientController.updateNotificationSettings);
router.get('/notifications', auth, clientController.getNotifications);
router.put('/notifications/read', auth, clientController.markNotificationsRead);

module.exports = router;