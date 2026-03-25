const { BARequirementModel, BATaskModel, BACommunicationModel } = require('../models/BAModels');
const { db } = require('../config/firebase');

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
      const prompt = `You are a senior Business Analyst AI. Extract requirements from the text. IMPORTANT: Even if the input text is very brief or vague, you MUST extrapolate and generate plausible, industry-standard assumptions to fill ALL arrays (Business, Software, User Stories, etc.). Do not leave any array empty. Respond ONLY with a valid JSON object: {"summary": "...", "businessRequirements": ["..."], "softwareRequirements": ["..."], "userStories": ["..."], "acceptanceCriteria": ["..."], "riskFactors": ["..."], "ambiguousTerms": [{"term": "...", "suggestion": "..."}], "suggestedQuestions": ["..."]}`;
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
    
    const perspectives = [
      "Security & Data Privacy",
      "User Experience & Accessibility",
      "Scalability & Performance",
      "Payment Gateways & Integrations",
      "Legal Compliance & Auditing",
      "Mobile Responsiveness"
    ];
    const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

    let aiProcessedData;
    try { 
      const prompt = `You are a highly creative senior Business Analyst AI. 
      We are REGENERATING an analysis for this text. 
      CRITICAL INSTRUCTION: You MUST analyze this project entirely through the lens of: "${randomPerspective}". 
      Provide COMPLETELY NEW and UNIQUE user stories, risk factors, and especially DIFFERENT suggested clarification questions focused heavily on ${randomPerspective}. Do not repeat generic questions. Do not leave any array empty. 
      Respond ONLY with a valid JSON object: {"summary": "...", "businessRequirements": ["..."], "softwareRequirements": ["..."], "userStories": ["..."], "acceptanceCriteria": ["..."], "riskFactors": ["..."], "ambiguousTerms": [{"term": "...", "suggestion": "..."}], "suggestedQuestions": ["..."]}`;
      
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
    await BACommunicationModel.sendClarificationQuestions(req.body.reqId, req.body.questions, req.baId, req.body.baName || "Your BA");
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
  } catch (error) { 
    console.error("Answer submit error:", error);
    res.status(500).json({ success: false }); 
  }
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
        const prompt = `You are an expert Technical Project Manager. Break down these requirements into 4 to 8 specific technical tasks.
        Summary: ${aiProcessedData.summary}. 
        Features: ${aiProcessedData.softwareRequirements.join(". ")}. 
        
        CRITICAL INSTRUCTION 1: Accurately distribute the 'requiredRole'. Choose EXACTLY from: 'Front-end Developer', 'Back-end Developer', 'Full-stack Developer', 'Mobile App Developer', 'Game Developer', 'DevOps Engineer', 'Database Developer', 'AI/ML Developer'.
        
        CRITICAL INSTRUCTION 2: Determine the overall 'projectType'. Choose EXACTLY from: 'Web Development', 'Mobile Development', 'Desktop Development', 'Game Development', 'Embedded Systems Development', 'Cloud Development', 'DevOps Development', 'AI / Machine Learning Development', 'Data Science Development', 'Cybersecurity Development'.
        
        Respond ONLY with a JSON object matching this format: 
        {
          "projectType": "Web Development",
          "tasks": [
            {"title": "Design interactive UI components", "priority": "Medium", "requiredRole": "Front-end Developer"},
            {"title": "Build secure payment API", "priority": "High", "requiredRole": "Back-end Developer"}
          ]
        }`;
        
        aiResponse = await callOpenAI("Generate technical tasks.", prompt, 0.7); 
      } catch(e) { console.error("AI Task Generation Failed:", e); }
    } 
    
    if(!aiResponse.tasks || aiResponse.tasks.length === 0) {
      aiResponse = {
        projectType: "Web Development",
        tasks: [
          { title: "Design database schema for new features", priority: "High", requiredRole: "Database Developer" },
          { title: "Implement core API functionality", priority: "High", requiredRole: "Back-end Developer" },
          { title: "Build responsive frontend UI", priority: "Medium", requiredRole: "Front-end Developer" }
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
    
    allTasks.sort((a, b) => {
        const numA = parseInt(a.taskId.split('-').pop(), 10) || 0;
        const numB = parseInt(b.taskId.split('-').pop(), 10) || 0;
        return numA - numB;
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
      res.json({ success: true, message: "Tasks forwarded to Team Leader successfully" });
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
    res.json({ success: true, message: "Successfully sent to engineering team" });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { 
  requireBaId,
  getDashboardOverview, getInboxRequirements, claimRequirement, searchAllItems, getAnalyzedHistory, 
  processRequirementWithAI, regenerateRequirementWithAI, saveEditedAIAnalysis, 
  sendClarificationQuestions, getReqClarifications, answerClarification, 
  getReadyRequirements, getDevelopers, generateTasksWithAI, saveAssignedTasks, removeTaskFromQueue, sendToEngineering
};