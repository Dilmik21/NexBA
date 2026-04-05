const express = require('express');
const router = express.Router();

// 🚨 FIXED: Ensure case sensitivity matches your file name
const baController = require('../controllers/baController'); 

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
  removeTaskFromQueue, 
  sendToEngineering,
  getChangeRequests, 
  updateChangeStatus,
  getVerificationTasks, 
  approveTaskVerification, 
  rejectTaskVerification,
  getChatRequirements, 
  getChatMessages,     
  sendChatMessage,     
  markMessagesRead,
  getProgressAndReports,
  getSettings,                
  updateGeneralSettings,      
  updateSecuritySettings,     
  updateNotificationSettings  
} = baController;

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
router.delete('/tasks/:taskId', requireBaId, removeTaskFromQueue);
router.post('/tasks/forward', requireBaId, sendToEngineering); 

router.get('/changes', requireBaId, getChangeRequests);
router.put('/changes/:crId/status', requireBaId, updateChangeStatus);

router.get('/verification', requireBaId, getVerificationTasks);
router.post('/verification/:taskId/approve', requireBaId, approveTaskVerification);
router.post('/verification/:taskId/reject', requireBaId, rejectTaskVerification);

router.get('/chat/list', requireBaId, getChatRequirements);
router.get('/chat/:reqId/:channel', requireBaId, getChatMessages);
router.post('/chat/:reqId/:channel', requireBaId, sendChatMessage);
router.put('/chat/:reqId/:channel/read', requireBaId, markMessagesRead);

router.get('/progress', requireBaId, getProgressAndReports);

// --- Profile & Settings ---
router.get('/settings', requireBaId, getSettings);
router.put('/settings/general', requireBaId, updateGeneralSettings);
router.put('/settings/security', requireBaId, updateSecuritySettings);
router.put('/settings/notifications', requireBaId, updateNotificationSettings);

module.exports = router;