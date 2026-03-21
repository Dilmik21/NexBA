const express = require('express');
const router = express.Router();

// Destructuring everything from the controller for cleaner route definitions
const { 
  requireBaId,
  getDashboardOverview,
  searchAllItems,
  getInboxRequirements,
  claimRequirement,
  getAnalyzedHistory,
  processRequirementWithAI,
  regenerateRequirementWithAI,
  saveEditedAIAnalysis,
  getReqClarifications,
  sendClarificationQuestions,
  getReadyRequirements,
  getDevelopers,
  generateTasksWithAI,
  saveAssignedTasks
} = require('../controllers/baController');

// --- 1. OVERVIEW, INBOX & CLAIMING ---
// The requireBaId middleware acts as a bouncer for every single route!
router.get('/overview', requireBaId, getDashboardOverview);
router.get('/search', requireBaId, searchAllItems);
router.get('/inbox', requireBaId, getInboxRequirements);
router.post('/claim/:id', requireBaId, claimRequirement); // <-- NEW CLAIM ROUTE!

// --- 2. AI ANALYSIS ROUTES ---
router.get('/history', requireBaId, getAnalyzedHistory); 
router.post('/analyze/:id', requireBaId, processRequirementWithAI);
router.post('/analyze/:id/regenerate', requireBaId, regenerateRequirementWithAI); 
router.put('/analyze/:id', requireBaId, saveEditedAIAnalysis); 

// --- 3. CLARIFICATION ROUTES ---
router.get('/analyze/:id/clarifications', requireBaId, getReqClarifications);
router.post('/clarifications/send', requireBaId, sendClarificationQuestions);

// --- 4. TASK & ASSIGNMENT ROUTES ---
router.get('/tasks/ready-requirements', requireBaId, getReadyRequirements); 
router.get('/tasks/developers', requireBaId, getDevelopers); 
router.post('/tasks/generate/:reqId', requireBaId, generateTasksWithAI); 
router.post('/tasks/assign', requireBaId, saveAssignedTasks); 

module.exports = router;