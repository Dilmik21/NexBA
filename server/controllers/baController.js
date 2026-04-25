const { BARequirementModel, BATaskModel, BAChangeModel, BAVerificationModel, BACommunicationHubModel, BACommunicationModel, BAProgressModel, BAUserModel } = require('../models/BAModels');
const { db } = require('../config/firebase');
const { sendNotification } = require('../services/notificationService');

// THE FIX: Reverted to the stable version of pdf-parse
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

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

const extractTextFromFileData = async (fileName, fileData) => {
  if (!fileData || !fileName || fileName === "No file attached") return null;

  try {
      let fileBuffer;

      // 1. Clean the Data
      if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
          console.log(`📥 Downloading file from URL: ${fileName}...`);
          const response = await fetch(fileData);
          if (!response.ok) throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
          
          const filePreview = fileBuffer.toString('utf-8', 0, 50);
          if (filePreview.includes('<!DOCTYPE html>') || filePreview.includes('<html')) {
             console.error("🚨 ALERT: Downloaded file is an HTML page (Likely Firebase Access Denied error), NOT a PDF!");
             return null;
          }
      } else {
          console.log(`📥 Extracting file from Base64: ${fileName}...`);
          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          fileBuffer = Buffer.from(base64Data, 'base64');
      }

      const ext = fileName.split('.').pop().toLowerCase();

      // 2. Extract based on file type
      if (ext === 'pdf') {
          console.log(`📄 Attempting to parse PDF: ${fileName}...`);
          // THE FIX: Clean, direct call to the stable version of pdf-parse
          const pdfData = await pdfParse(fileBuffer);
          console.log(`✅ Successfully extracted ${pdfData.text.length} characters from PDF!`);
          return pdfData.text; 
      } else if (ext === 'docx') {
          console.log(`📄 Attempting to parse DOCX: ${fileName}...`);
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          return docxData.value; 
      } else if (ext === 'txt') {
          return fileBuffer.toString('utf-8');
      }
      return null; 
  } catch (error) {
      console.error(`🚨 Failed to extract text from ${fileName}:`, error.message);
      return null;
  }
};

const callOpenAI = async (rawText, promptSystem, temp = 0.3) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
  if (!OPENAI_API_KEY) {
      console.error("🚨 Missing OPENAI_API_KEY in backend .env file!");
      throw new Error("Missing API Key");
  }

  const safeText = rawText.length > 15000 ? rawText.substring(0, 15000) + "... [TRUNCATED DUE TO LENGTH]" : rawText;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", 
    headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${OPENAI_API_KEY}` 
    },
    body: JSON.stringify({ 
      model: "gpt-3.5-turbo-1106", 
      response_format: { type: "json_object" }, 
      messages: [
          { role: "system", content: promptSystem }, 
          { role: "user", content: safeText }
      ], 
      temperature: temp 
    })
  });

  if (!response.ok) {
      const errText = await response.text();
      console.error("🚨 OpenAI API Error:", errText);
      throw new Error(`OpenAI API failed: ${response.status}`);
  }

  const aiResult = await response.json();
  const content = aiResult.choices[0].message.content;

  try {
      return JSON.parse(content);
  } catch (e) {
      console.error("🚨 Failed to parse OpenAI JSON. Raw string:", content);
      throw new Error("Invalid JSON returned from OpenAI");
  }
};

const getFallbackAIData = (rawTextToProcess, perspective = "General Analysis") => {
  const randomId = Math.floor(Math.random() * 10000); 
  return {
    summary: `[FALLBACK MODE ACTIVE] The AI failed to generate a proper response. Attempt #${randomId}.`,
    businessRequirements: [`Ensure system meets ${perspective} standards.`, `Align with core business logic.`, `Maintain operational efficiency.`],
    softwareRequirements: [`Develop technical features for ${perspective}.`, `Implement secure data handling.`],
    userStories: [`As a user, I want ${perspective} to be handled correctly so I can use the app safely.`],
    acceptanceCriteria: [`System must pass ${perspective} testing protocols.`, `UI must be responsive.`],
    riskFactors: [`Unforeseen challenges related to ${perspective}.`],
    ambiguousTerms: [{ term: "system", suggestion: `Please specify the ${perspective} architecture.` }],
    suggestedQuestions: [`Can you provide more details regarding ${perspective}?`],
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

    let combinedTextToAnalyze = "";

    if (reqData.description && reqData.description !== "No description provided.") {
        combinedTextToAnalyze += "--- CLIENT MANUAL DESCRIPTION ---\n" + reqData.description + "\n\n";
    }

    const fileDataToParse = reqData.fileData || reqData.fileUrl;
    const extractedFileText = await extractTextFromFileData(reqData.fileName, fileDataToParse);

    if (extractedFileText) {
        combinedTextToAnalyze += `--- EXTRACTED CONTENT FROM DOCUMENT (${reqData.fileName}) ---\n${extractedFileText}\n\n`;
    } else if (reqData.fileName && reqData.fileName !== "No file attached") {
        combinedTextToAnalyze += `--- ATTACHED DOCUMENT ---\nThe client attached a supporting file named "${reqData.fileName}", but text could not be extracted. Provide an analysis based on the available description context.\n\n`;
    }

    if (!combinedTextToAnalyze.trim()) {
        combinedTextToAnalyze = reqData.text || "Empty requirement.";
    }

    const prompt = `You are a senior Business Analyst AI. Extract and analyze requirements from the provided text. 
    
    CRITICAL RULES:
    1. Even if the text is short, brainstorm and infer detailed requirements. DO NOT leave ANY arrays empty. Provide at least 2-3 detailed strings for each array.
    2. For ambiguousTerms, the "term" value MUST be an EXACT, word-for-word copy of a short phrase found directly inside the original text. Do not paraphrase it, or the frontend highlighting system will break.

    You MUST respond strictly with a valid JSON object matching EXACTLY this structure:
    {
      "summary": "A 2-3 sentence overview of the project.",
      "businessRequirements": ["Generated detail 1", "Generated detail 2", "Generated detail 3"],
      "softwareRequirements": ["Generated detail 1", "Generated detail 2"],
      "userStories": ["As a user, I want to [action] so that [benefit]"],
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
      "riskFactors": ["Risk 1", "Risk 2"],
      "ambiguousTerms": [{"term": "EXACT string from the text", "suggestion": "Ask the client to clarify this word"}],
      "suggestedQuestions": ["Question to ask client 1", "Question 2"]
    }`;

    let aiProcessedData;
    try { 
      aiProcessedData = await callOpenAI(combinedTextToAnalyze, prompt, 0.3); 
      aiProcessedData.processedText = combinedTextToAnalyze;
      
      if (!aiProcessedData.businessRequirements || aiProcessedData.businessRequirements.length === 0) {
         throw new Error("AI returned empty arrays.");
      }
    } catch (e) { 
      console.error("Falling back due to AI error or empty arrays...");
      aiProcessedData = getFallbackAIData(combinedTextToAnalyze, "Initial Processing"); 
    }

    const updatedData = await BARequirementModel.updateAIAnalysis(id, aiProcessedData, true);
    res.json({ success: true, data: aiProcessedData, reqDetails: updatedData, clarifications });
  } catch (error) { 
      console.error("Endpoint crash:", error);
      res.status(500).json({ success: false }); 
  }
};

const regenerateRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await BARequirementModel.getRequirementByReqId(id);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const reqData = reqDoc.data;
    let combinedTextToAnalyze = "";

    if (reqData.description && reqData.description !== "No description provided.") {
        combinedTextToAnalyze += "--- CLIENT MANUAL DESCRIPTION ---\n" + reqData.description + "\n\n";
    }

    const fileDataToParse = reqData.fileData || reqData.fileUrl;
    const extractedFileText = await extractTextFromFileData(reqData.fileName, fileDataToParse);

    if (extractedFileText) {
        combinedTextToAnalyze += `--- EXTRACTED CONTENT FROM DOCUMENT (${reqData.fileName}) ---\n${extractedFileText}\n\n`;
    } else if (reqData.fileName && reqData.fileName !== "No file attached") {
        combinedTextToAnalyze += `--- ATTACHED DOCUMENT ---\nFile Name: "${reqData.fileName}".\n\n`;
    }

    if (!combinedTextToAnalyze.trim()) combinedTextToAnalyze = "Empty requirement.";
    
    const perspectives = ["Security & Data Privacy", "User Experience & Accessibility", "Scalability & Performance"];
    const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    const prompt = `You are a highly creative senior Business Analyst AI. REGENERATE the analysis focusing strictly on: "${randomPerspective}".
    
    CRITICAL RULES:
    1. Even if the provided text is short, you MUST brainstorm and infer detailed requirements related to ${randomPerspective}. DO NOT leave ANY arrays empty. Generate at least 3 detailed items per array.
    2. For ambiguousTerms, the "term" value MUST be an EXACT, word-for-word substring copied directly from the original text.

    You MUST respond strictly with a valid JSON object matching EXACTLY this structure:
    {
      "summary": "A detailed 2-3 sentence overview from the perspective of ${randomPerspective}.",
      "businessRequirements": ["Generated detail 1", "Generated detail 2", "Generated detail 3"],
      "softwareRequirements": ["Generated technical req 1", "Generated technical req 2"],
      "userStories": ["As a user, I want to [action] so that [benefit]"],
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
      "riskFactors": ["Risk 1", "Risk 2"],
      "ambiguousTerms": [{"term": "EXACT string from text", "suggestion": "Clarification needed"}],
      "suggestedQuestions": ["Question 1", "Question 2"]
    }`;

    let aiProcessedData;
    try { 
      aiProcessedData = await callOpenAI(combinedTextToAnalyze, prompt, 0.7); 
      aiProcessedData.processedText = combinedTextToAnalyze;

      if (!aiProcessedData.businessRequirements || aiProcessedData.businessRequirements.length === 0) {
          throw new Error("AI returned empty arrays.");
      }
    } catch (e) { 
      console.error("Falling back during regeneration due to AI error...");
      aiProcessedData = getFallbackAIData(combinedTextToAnalyze, randomPerspective); 
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
    let aiResponse = { projectType: "Web Development", tasks: [] };

    const reqDoc = await BARequirementModel.getRequirementByReqId(reqId);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    const reqData = reqDoc.data;

    const clarifications = await BACommunicationModel.getClarifications(reqId);
    let qaContext = "";
    if (clarifications && clarifications.length > 0) {
        qaContext = "--- CLIENT CLARIFICATIONS (Q&A) ---\n";
        clarifications.forEach(c => {
            qaContext += `Question from BA: ${c.question}\nAnswer from Client: ${c.answer || 'No answer provided yet'}\n\n`;
        });
    }

    const fileDataToParse = reqData.fileData || reqData.fileUrl;
    const extractedFileText = await extractTextFromFileData(reqData.fileName, fileDataToParse);

    let combinedTextToAnalyze = "";

    if (reqData.description && reqData.description !== "No description provided.") {
        combinedTextToAnalyze += "--- ORIGINAL CLIENT MANUAL DESCRIPTION ---\n" + reqData.description + "\n\n";
    }

    if (extractedFileText) {
        combinedTextToAnalyze += `--- EXTRACTED CONTENT FROM DOCUMENT (${reqData.fileName}) ---\n${extractedFileText}\n\n`;
    }

    if (reqData.aiProcessedData) {
        combinedTextToAnalyze += `--- CURRENT BA ANALYSIS & EDITS ---\n${JSON.stringify(reqData.aiProcessedData, null, 2)}\n\n`;
    }

    if (qaContext) {
        combinedTextToAnalyze += qaContext;
    }

    if (!combinedTextToAnalyze.trim()) {
        combinedTextToAnalyze = reqData.text || "Empty requirement.";
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `You are an expert Technical Project Manager. Break down these requirements into technical tasks. 
        You MUST base your tasks on the original description, the document text, the BA's analysis, and especially the Client's Clarification Answers provided in the context.
        You MUST respond strictly with a valid JSON object exactly like this:
        {
          "projectType": "Web Development",
          "tasks": [
            { "title": "Setup database", "priority": "High", "requiredRole": "Database Developer" }
          ]
        }`;
        aiResponse = await callOpenAI(combinedTextToAnalyze, prompt, 0.7); 
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

const rejectTaskVerification = async (req, res) => {
  try {
    const frontendId = req.params.taskId; 
    await BAVerificationModel.rejectTask(frontendId, req.body.reason);
    
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

const sendChatMessage = async (req, res) => {
  try {
    const { reqId, channel } = req.params;
    const { text, fileData, senderName } = req.body;
    
    const newMsg = await BACommunicationHubModel.sendMessage(reqId, req.baId, senderName, channel, text, fileData);

    const channelName = channel.toLowerCase();

    const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnap.empty) {
        const reqData = reqSnap.docs[0].data();
        
        if (channelName === 'client' || channelName === 'group') {
            const clientId = reqData.uid || reqData.clientId;
            if (clientId) {
                await sendNotification({
                    recipientId: clientId,
                    title: "New Message",
                    message: `${senderName || "Your BA"} sent a message in the ${channel} chat for project ${reqId}.`,
                    type: "Communication",
                    link: "/client/messages"
                });
            }
        } 
        if (channelName === 'developer' || channelName === 'internal' || channelName === 'group') {
             const developerId = reqData.teamLeaderId || reqData.developerId;
             if (developerId) {
                 await sendNotification({
                     recipientId: developerId,
                     title: "New Message",
                     message: `${senderName || "Your BA"} sent a message in the ${channel} chat for project ${reqId}.`,
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