const express = require('express');
const router = express.Router();
const baController = require('../controllers/baController');

router.get('/overview', baController.getDashboardOverview);
router.get('/search', baController.searchAllItems);
router.get('/inbox', baController.getInboxRequirements);

// AI ANALYSIS ROUTES
router.get('/history', baController.getAnalyzedHistory); 
router.post('/analyze/:id', baController.processRequirementWithAI);
router.post('/analyze/:id/regenerate', baController.regenerateRequirementWithAI); 
router.put('/analyze/:id', baController.saveEditedAIAnalysis); 

// CLARIFICATION ROUTES
router.get('/analyze/:id/clarifications', baController.getReqClarifications); // <-- NEW ROUTE
router.post('/clarifications/send', baController.sendClarificationQuestions);

module.exports = router;