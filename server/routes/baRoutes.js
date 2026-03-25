const express = require('express');
const router = express.Router();

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
  answerClarification,
  getReadyRequirements,
  getDevelopers,
  generateTasksWithAI,
  saveAssignedTasks,
  removeTaskFromQueue, // <-- Added
  sendToEngineering
} = require('../controllers/baController');

router.get('/overview', requireBaId, getDashboardOverview);
router.get('/search', requireBaId, searchAllItems);
router.get('/inbox', requireBaId, getInboxRequirements);
router.post('/claim/:id', requireBaId, claimRequirement); 

router.get('/history', requireBaId, getAnalyzedHistory); 
router.post('/analyze/:id', requireBaId, processRequirementWithAI);
router.post('/analyze/:id/regenerate', requireBaId, regenerateRequirementWithAI); 
router.put('/analyze/:id', requireBaId, saveEditedAIAnalysis); 

router.get('/analyze/:id/clarifications', requireBaId, getReqClarifications);
router.post('/clarifications/send', requireBaId, sendClarificationQuestions);

router.get('/tasks/ready-requirements', requireBaId, getReadyRequirements); 
router.get('/tasks/developers', requireBaId, getDevelopers); 
router.post('/tasks/generate/:reqId', requireBaId, generateTasksWithAI); 
router.post('/tasks/assign', requireBaId, saveAssignedTasks); 

// --- ADDED: Delete task endpoint ---
router.delete('/tasks/:taskId', requireBaId, removeTaskFromQueue);

router.post('/tasks/forward', requireBaId, sendToEngineering); 

module.exports = router;