const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.post('/projects', clientController.submitProject);
router.get('/overview-stats', clientController.getOverviewStats);
router.get('/project-progress', clientController.getProjectProgress);
router.get('/change-requests', clientController.getChangeRequests);
router.get('/action-items', clientController.getActionItems);
router.get('/recent-activity', clientController.getRecentActivity);
router.get('/search', clientController.searchRequirements);
router.get('/requests', clientController.getAllRequests);

// --- CLARIFICATION & APPROVAL ROUTES ---
router.get('/clarifications', clientController.getClarifications);
router.post('/clarifications/:id/answer', clientController.answerClarification);
router.get('/approvals', clientController.getApprovals);
router.post('/approvals/:id/approve', clientController.approveRequirement);
router.post('/approvals/:id/request-change', clientController.requestChangeForRequirement);

// --- MESSAGE & ARCHIVE ROUTES ---
router.get('/messages', clientController.getMessages);
router.post('/messages', clientController.sendMessage);
router.get('/archive', clientController.getArchivedRequirements);

// --- SETTINGS ROUTES ---
router.get('/settings', clientController.getSettings);
router.put('/settings/general', clientController.updateGeneralSettings);
router.put('/settings/security', clientController.updateSecuritySettings);
router.put('/settings/notifications', clientController.updateNotificationSettings);

// --- NEW: NOTIFICATION ROUTES ---
router.get('/notifications', clientController.getNotifications);
router.put('/notifications/read', clientController.markNotificationsRead);

module.exports = router;