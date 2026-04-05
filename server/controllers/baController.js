const { BARequirementModel, BATaskModel, BAChangeModel, BAVerificationModel, BACommunicationHubModel, BACommunicationModel, BAProgressModel, BAUserModel } = require('../models/BAModels');
const { db } = require('../config/firebase');
const { sendNotification } = require('../services/notificationService');

const requireBaId = (req, res, next) => {
  const baId = req.query.uid || req.body.uid;
  if (!baId) return res.status(401).json({ success: false, message: "Unauthorized BA: Missing UID" });
  req.baId = baId;
  next();
};

const getDashboardOverview = async (req, res) => {
  try {
    const dashboardData = await BARequirementModel.getDashboardData(req.baId);
    res.json({ success: true, data: dashboardData });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getInboxRequirements = async (req, res) => {
  try {
    const inbox = await BARequirementModel.getInbox(req.baId);
    res.json({ success: true, data: inbox });
  } catch (error) { res.status(500).json({ success: false }); }
};

const claimRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { baName } = req.body;
    await BARequirementModel.claimRequirement(id, req.baId, baName || "Unknown BA");
    
    // --- 🚨 NOTIFICATION: Alert Client 🚨 ---
    let clientId = null;
    const reqSnap = await db.collection('requirements').where('reqId', '==', id).get();
    if (!reqSnap.empty) {
        clientId = reqSnap.docs[0].data().uid || reqSnap.docs[0].data().clientId;
    } else {
        const docRef = await db.collection('requirements').doc(id).get();
        if (docRef.exists) clientId = docRef.data().uid || docRef.data().clientId;
    }

    if (clientId) {
        await sendNotification({
            recipientId: clientId,
            title: "Project Claimed",
            message: `${baName || "A Business Analyst"} has been assigned to your project and is beginning the analysis.`,
            type: "System",
            link: "/client/requests"
        });
    }

    res.json({ success: true, message: "Requirement claimed successfully" });
  } catch (error) { 
    if (error.message === "Not found") return res.status(404).json({ success: false, message: "Requirement not found" });
    res.status(500).json({ success: false }); 
  }
};

const searchAllItems = async (req, res) => {
  try {
    const rawQuery = req.query.q || '';
    if (!rawQuery.trim()) return res.json({ success: true, data: [] });
    const searchResults = await BARequirementModel.search(rawQuery, req.baId);
    res.json({ success: true, data: searchResults });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getAnalyzedHistory = async (req, res) => {
  try {
    const history = await BARequirementModel.getHistory(req.baId);
    res.json({ success: true, data: history });
  } catch (error) { res.status(500).json({ success: false }); }
};

const callOpenAI = async (rawText, promptSystem, temp = 0.3) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
  if (!OPENAI_API_KEY) throw new Error("Missing API Key");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ 
      model: "gpt-3.5-turbo", 
      messages: [{ role: "system", content: promptSystem }, {role: "user", content: rawText}], 
      temperature: temp 
    })
  });
  if (!response.ok) throw new Error(`OpenAI API failed`);
  const aiResult = await response.json();
  return JSON.parse(aiResult.choices[0].message.content);
};

const getFallbackAIData = (rawTextToProcess, perspective = "General Analysis") => {
  const randomId = Math.floor(Math.random() * 10000); 
  return {
    summary: `[FALLBACK MODE ACTIVE] Generated from perspective: ${perspective}. Attempt #${randomId}.`,
    businessRequirements: [`Ensure system meets ${perspective} standards.`],
    softwareRequirements: [`Develop technical features for ${perspective}.`],
    userStories: [`As a user, I want ${perspective} to be handled correctly.`],
    acceptanceCriteria: [`System must pass ${perspective} testing protocols.`],
    riskFactors: [`Unforeseen challenges related to ${perspective}.`],
    ambiguousTerms: [{ term: "system", suggestion: `Please specify the ${perspective} architecture.` }],
    suggestedQuestions: [`Can you provide more details regarding ${perspective}?`, `Question Code: ${randomId}`],
    processedText: rawTextToProcess
  };
};

const processRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await BARequirementModel.getRequirementByReqId(id);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const reqData = reqDoc.data;
    const clarifications = await BACommunicationModel.getClarifications(id);

    if (reqData.aiProcessedData) {
      if (reqData.status === "Pending BA Review") {
          await BARequirementModel.updateAIAnalysis(id, reqData.aiProcessedData, true);
      }
      return res.json({ 
        success: true, 
        data: reqData.aiProcessedData, 
        reqDetails: { ...reqData, status: "In Analysis" },
        clarifications: clarifications 
      });
    }

    const rawTextToProcess = reqData.description || reqData.text || "Empty requirement.";
    let aiProcessedData;
    try { 
      const prompt = `You are a senior Business Analyst AI. Extract requirements from the text. Respond ONLY with a valid JSON object.`;
      aiProcessedData = await callOpenAI(rawTextToProcess, prompt, 0.3); 
      aiProcessedData.processedText = rawTextToProcess;
    } catch (e) { 
      aiProcessedData = getFallbackAIData(rawTextToProcess, "Initial Processing"); 
    }

    const updatedData = await BARequirementModel.updateAIAnalysis(id, aiProcessedData, true);
    res.json({ success: true, data: aiProcessedData, reqDetails: updatedData, clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

const regenerateRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await BARequirementModel.getRequirementByReqId(id);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const rawTextToProcess = reqDoc.data.description || reqDoc.data.text || "Empty requirement.";
    
    const perspectives = ["Security & Data Privacy", "User Experience & Accessibility", "Scalability & Performance"];
    const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    let aiProcessedData;
    try { 
      const prompt = `You are a highly creative senior Business Analyst AI. REGENERATE analysis focusing on: "${randomPerspective}". Respond ONLY with a valid JSON object.`;
      aiProcessedData = await callOpenAI(rawTextToProcess, prompt, 1.0); 
      aiProcessedData.processedText = rawTextToProcess;
    } catch (e) { 
      aiProcessedData = getFallbackAIData(rawTextToProcess, randomPerspective); 
    }

    await BARequirementModel.updateAIAnalysis(id, aiProcessedData, false);
    res.json({ success: true, data: aiProcessedData });
  } catch (error) { res.status(500).json({ success: false }); }
};

const saveEditedAIAnalysis = async (req, res) => {
  try {
    await BARequirementModel.updateAIAnalysis(req.params.id, req.body, false);
    res.json({ success: true, data: req.body });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendClarificationQuestions = async (req, res) => {
  try {
    const baName = req.body.baName || "Your BA";
    await BACommunicationModel.sendClarificationQuestions(req.body.reqId, req.body.questions, req.baId, baName);
    
    // --- 🚨 NOTIFICATION: Alert Client 🚨 ---
    const reqSnap = await db.collection('requirements').where('reqId', '==', req.body.reqId).get();
    if (!reqSnap.empty) {
        const clientId = reqSnap.docs[0].data().uid || reqSnap.docs[0].data().clientId;
        if (clientId) {
            await sendNotification({
                recipientId: clientId,
                title: "Clarification Needed",
                message: `Your Business Analyst has asked a few questions regarding project ${req.body.reqId}.`,
                type: "Requirement",
                link: "/client/clarifications"
            });
        }
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getReqClarifications = async (req, res) => {
  try {
    const clarifications = await BACommunicationModel.getClarifications(req.params.id);
    res.json({ success: true, data: clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

const answerClarification = async (req, res) => {
  try {
    const { id } = req.params; 
    const { answer } = req.body;
    await BACommunicationModel.submitAnswer(id, answer); 
    res.json({ success: true, message: "Answer saved and status updated" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getReadyRequirements = async (req, res) => {
  try {
    const data = await BATaskModel.getReadyRequirements(req.baId);
    res.json({ success: true, data: data.reqs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getDevelopers = async (req, res) => {
  try {
    const devs = await BATaskModel.getTeamLeaders();
    res.json({ success: true, data: devs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const generateTasksWithAI = async (req, res) => {
  try {
    const { reqId } = req.params;
    const { aiProcessedData } = req.body;
    let aiResponse = { projectType: "Web Development", tasks: [] };

    if (process.env.OPENAI_API_KEY && aiProcessedData) {
      try {
        const prompt = `You are an expert Technical Project Manager. Break down these requirements into technical tasks. Respond ONLY with a JSON object.`;
        aiResponse = await callOpenAI("Generate technical tasks.", prompt, 0.7); 
      } catch(e) { console.error("AI Task Generation Failed:", e); }
    } 
    
    if(!aiResponse.tasks || aiResponse.tasks.length === 0) {
      aiResponse = {
        projectType: "Web Development",
        tasks: [
          { title: "Design database schema", priority: "High", requiredRole: "Database Developer" },
          { title: "Implement core API", priority: "High", requiredRole: "Back-end Developer" }
        ]
      };
    }

    await BATaskModel.clearAndSaveAITasks(reqId, aiResponse.tasks, aiResponse.projectType);
    
    const updatedTasksSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    let allTasks = [];
    updatedTasksSnap.forEach(doc => {
       const t = doc.data();
       t.displayId = t.taskId;
       allTasks.push(t);
    });

    res.json({ success: true, data: allTasks, projectType: aiResponse.projectType });
  } catch (error) { res.status(500).json({ success: false }); }
};

const saveAssignedTasks = async (req, res) => {
  try {
    if (req.body.task) {
      await BATaskModel.saveManualTask(req.body.reqId, req.body.task);
      res.json({ success: true, message: "Manual task added to queue." });
    } else {
      await BATaskModel.sendToEngineeringTeam(req.body.reqId, req.body.leaderId, req.body.leaderName);
      
      // --- 🚨 NOTIFICATION: Alert Developer 🚨 ---
      if (req.body.leaderId) {
          await sendNotification({
              recipientId: req.body.leaderId,
              title: "New Project Assigned",
              message: `You have been assigned as the Team Leader for requirement ${req.body.reqId}.`,
              type: "Task",
              link: "/dev/tasks"
          });
      }

      res.json({ success: true, message: "Tasks forwarded successfully" });
    }
  } catch (error) { res.status(500).json({ success: false }); }
};

const removeTaskFromQueue = async (req, res) => {
  try {
    const updatedTasks = await BATaskModel.removeTask(req.params.taskId);
    if (updatedTasks !== null) {
      res.json({ success: true, message: "Task deleted and IDs rearranged", data: updatedTasks });
    } else {
      res.status(404).json({ success: false, message: "Task not found" });
    }
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendToEngineering = async (req, res) => {
  try {
    await BATaskModel.sendToEngineeringTeam(req.body.reqId, req.body.leaderId, req.body.leaderName);
    
    if (req.body.leaderId) {
        await sendNotification({
            recipientId: req.body.leaderId,
            title: "New Tasks Assigned",
            message: `You have new tasks pending for requirement ${req.body.reqId}.`,
            type: "Task",
            link: "/dev/tasks"
        });
    }

    res.json({ success: true, message: "Successfully sent to engineering team" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getChangeRequests = async (req, res) => {
  try {
    const crs = await BAChangeModel.getChangeRequests(req.baId);
    res.json({ success: true, data: crs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateChangeStatus = async (req, res) => {
  try {
    const updatedCR = await BAChangeModel.updateChangeStatus(req.params.crId, req.body.status);

    let clientId = null;
    const crSnap = await db.collection('change_requests').where('crId', '==', req.params.crId).get();
    if (!crSnap.empty) {
        clientId = crSnap.docs[0].data().uid || crSnap.docs[0].data().clientId;
    } else {
        const docRef = await db.collection('change_requests').doc(req.params.crId).get();
        if (docRef.exists) clientId = docRef.data().uid || docRef.data().clientId;
    }

    if (clientId) {
        await sendNotification({
            recipientId: clientId,
            title: "Change Request Updated",
            message: `Your change request has been reviewed. Its status is now: ${req.body.status}.`,
            type: "Change Request",
            link: "/client/requests" 
        });
    }

    res.json({ success: true, data: updatedCR });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getVerificationTasks = async (req, res) => {
  try {
    const verifications = await BAVerificationModel.getPendingVerifications(req.baId);
    res.json({ success: true, data: verifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

const approveTaskVerification = async (req, res) => {
  try {
    const frontendId = req.params.taskId; 
    await BAVerificationModel.approveTask(frontendId);

    const reqSnap = await db.collection('requirements').where('reqId', '==', frontendId).get();
    if (!reqSnap.empty) {
        const clientId = reqSnap.docs[0].data().uid || reqSnap.docs[0].data().clientId;
        if (clientId) {
            await sendNotification({
                recipientId: clientId,
                title: "Feature Ready for UAT",
                message: `A task for project ${frontendId} has passed internal testing and is ready for your approval.`,
                type: "Approval",
                link: "/client/approvals"
            });
        }
    }

    res.json({ success: true, message: "Task approved and sent to client UAT" });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 🚨 FIXED: FIND DEV DIRECTLY FROM REQUIREMENT 🚨 ---
const rejectTaskVerification = async (req, res) => {
  try {
    const frontendId = req.params.taskId; 
    await BAVerificationModel.rejectTask(frontendId, req.body.reason);
    
    // Look up the requirement to find the dev reliably
    const reqSnap = await db.collection('requirements').where('reqId', '==', frontendId).get();
    
    if (!reqSnap.empty) {
        const reqData = reqSnap.docs[0].data();
        const developerId = reqData.teamLeaderId || reqData.developerId;
        
        if (developerId) {
            await sendNotification({
                recipientId: developerId,
                title: "Task Verification Rejected",
                message: `Your evidence for project ${frontendId} was rejected by the BA. Reason: ${req.body.reason}`,
                type: "Task",
                link: "/dev/evidence"
            });
        }
    }

    res.json({ success: true, message: "Task rejected and returned to developer" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getChatRequirements = async (req, res) => {
  try {
    const reqs = await BACommunicationHubModel.getChatRequirementsList(req.baId);
    res.json({ success: true, data: reqs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getChatMessages = async (req, res) => {
  try {
    const { reqId, channel } = req.params;
    const msgs = await BACommunicationHubModel.getMessagesForRequirement(reqId, channel);
    res.json({ success: true, data: msgs });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 🚨 FIXED: RELIABLY NOTIFY DEVELOPER FROM CHAT 🚨 ---
const sendChatMessage = async (req, res) => {
  try {
    const { reqId, channel } = req.params;
    const { text, fileData, senderName } = req.body;
    
    const newMsg = await BACommunicationHubModel.sendMessage(reqId, req.baId, senderName, channel, text, fileData);

    const channelName = channel.toLowerCase();

    const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnap.empty) {
        const reqData = reqSnap.docs[0].data();
        
        if (channelName === 'client') {
            const clientId = reqData.uid || reqData.clientId;
            if (clientId) {
                await sendNotification({
                    recipientId: clientId,
                    title: "New Message from BA",
                    message: `${senderName || "Your BA"} sent you a message regarding project ${reqId}.`,
                    type: "Communication",
                    link: "/client/messages"
                });
            }
        } 
        else if (channelName === 'developer' || channelName === 'internal') {
             // Extract dev ID directly from the requirement doc, bypass tasks!
             const developerId = reqData.teamLeaderId || reqData.developerId;
             if (developerId) {
                 await sendNotification({
                     recipientId: developerId,
                     title: "New Message from BA",
                     message: `${senderName || "Your BA"} sent a message regarding project ${reqId}.`,
                     type: "Communication",
                     link: "/dev/communication"
                 });
             }
        }
    }

    res.json({ success: true, data: newMsg });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markMessagesRead = async (req, res) => {
  try {
    const { reqId, channel } = req.params;
    const result = await BACommunicationHubModel.markMessagesAsRead(reqId, channel);
    res.json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getProgressAndReports = async (req, res) => {
  try {
    const data = await BAProgressModel.getProgressData(req.baId);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getSettings = async (req, res) => {
  try {
    const data = await BAUserModel.getSettings(req.baId);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateGeneralSettings = async (req, res) => {
  try {
    await BAUserModel.updateGeneralSettings(req.baId, req.body);
    res.json({ success: true, message: "Settings updated" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateSecuritySettings = async (req, res) => {
  try {
    await BAUserModel.updateSecuritySettings(req.baId, req.body.newPassword);
    res.json({ success: true, message: "Password updated" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    await BAUserModel.updateNotificationSettings(req.baId, key, value);
    res.json({ success: true, message: "Notification preference updated" });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { 
  requireBaId,
  getDashboardOverview, getInboxRequirements, claimRequirement, searchAllItems, getAnalyzedHistory, 
  processRequirementWithAI, regenerateRequirementWithAI, saveEditedAIAnalysis, 
  sendClarificationQuestions, getReqClarifications, answerClarification, 
  getReadyRequirements, getDevelopers, generateTasksWithAI, saveAssignedTasks, removeTaskFromQueue, sendToEngineering,
  getChangeRequests, updateChangeStatus,
  getVerificationTasks, approveTaskVerification, rejectTaskVerification,
  getChatRequirements, getChatMessages, sendChatMessage, markMessagesRead,
  getProgressAndReports,
  getSettings, updateGeneralSettings, updateSecuritySettings, updateNotificationSettings 
};