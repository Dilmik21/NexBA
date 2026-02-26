const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// All these routes will automatically have '/api/client' put in front of them by server.js
router.post('/projects', clientController.submitProject);
router.get('/overview-stats', clientController.getOverviewStats);
router.get('/project-progress', clientController.getProjectProgress);
router.get('/change-requests', clientController.getChangeRequests);
router.get('/action-items', clientController.getActionItems);
router.get('/recent-activity', clientController.getRecentActivity);
router.get('/search', clientController.searchRequirements);
router.get('/requests', clientController.getAllRequests);

module.exports = router;