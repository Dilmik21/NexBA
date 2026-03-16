const express = require('express');
const router = express.Router();
const baController = require('../controllers/baController');

router.get('/overview', baController.getDashboardOverview);
router.get('/search', baController.searchAllItems);
router.get('/inbox', baController.getInboxRequirements);

// --- AI ANALYSIS ROUTES ---
router.get('/history', baController.getAnalyzedHistory); 
router.post('/analyze/:id', baController.processRequirementWithAI);
router.post('/analyze/:id/regenerate', baController.regenerateRequirementWithAI); 
router.put('/analyze/:id', baController.saveEditedAIAnalysis); 

// --- CLARIFICATION ROUTES ---
router.get('/analyze/:id/clarifications', baController.getReqClarifications);
router.post('/clarifications/send', baController.sendClarificationQuestions);

// --- TASK & ASSIGNMENT ROUTES (NEW) ---
router.get('/tasks/ready-requirements', baController.getReadyRequirements); // Fetch requirements processed by AI
router.get('/tasks/developers', baController.getDevelopers); // Fetch developers & workloads
router.post('/tasks/generate/:reqId', baController.generateTasksWithAI); // Use OpenAI to break into tasks
router.post('/tasks/assign', baController.saveAssignedTasks); // Save tasks to DB

module.exports = router;