const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const baController = require('../controllers/baController'); 

// Ensure the middleware is applied to ALL routes
const auth = clientController.requireUid;

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
router.post('/clarifications/:id/answer', auth, baController.answerClarification);

// --- UPDATED COMMUNICATION HUB ROUTES ---
router.get('/chat/projects', auth, clientController.getChatProjects);
router.get('/chat/:reqId', auth, clientController.getProjectMessages);
router.post('/chat/:reqId', auth, clientController.sendProjectMessage);
router.put('/chat/:reqId/read', auth, clientController.markProjectMessagesRead); // Clears unread badges!

// Approvals & Archive
router.get('/approvals', auth, clientController.getApprovals);
router.post('/approvals/:id/approve', auth, clientController.approveRequirement);
router.post('/approvals/:id/request-change', auth, clientController.requestChangeForRequirement);
router.get('/archive', auth, clientController.getArchivedRequirements);

// Settings
router.get('/settings', auth, clientController.getSettings);
router.put('/settings/general', auth, clientController.updateGeneralSettings);
router.put('/settings/security', auth, clientController.updateSecuritySettings);
router.put('/settings/notifications', auth, clientController.updateNotificationSettings);
router.get('/notifications', auth, clientController.getNotifications);
router.put('/notifications/read', auth, clientController.markNotificationsRead);

module.exports = router;