// --- IMPORTING OUR NEW BA MODELS ---
const { BARequirementModel, BATaskModel, BACommunicationModel } = require('../models/BAModels');

// --- 1. OVERVIEW & INBOX ---
const getDashboardOverview = async (req, res) => {
  try {
    const dashboardData = await BARequirementModel.getDashboardData();
    res.json({ success: true, data: dashboardData });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getInboxRequirements = async (req, res) => {
  try {
    const inbox = await BARequirementModel.getInbox();
    res.json({ success: true, data: inbox });
  } catch (error) { res.status(500).json({ success: false }); }
};

const searchAllItems = async (req, res) => {
  try {
    const rawQuery = req.query.q || '';
    if (!rawQuery.trim()) return res.json({ success: true, data: [] });
    const searchResults = await BARequirementModel.search(rawQuery);
    res.json({ success: true, data: searchResults });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 2. AI REQUIREMENT PROCESSING ---
const getAnalyzedHistory = async (req, res) => {
  try {
    const history = await BARequirementModel.getHistory();
    res.json({ success: true, data: history });
  } catch (error) { res.status(500).json({ success: false }); }
};

// Internal OpenAI Helper
const callOpenAI = async (rawText, promptSystem) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
  if (!OPENAI_API_KEY) throw new Error("Missing API Key");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: promptSystem }, {role: "user", content: rawText}], temperature: 0.3 })
  });
  if (!response.ok) throw new Error(`OpenAI API failed`);
  const aiResult = await response.json();
  return JSON.parse(aiResult.choices[0].message.content);
};

// Fallback Helper if AI fails
const getFallbackAIData = (rawTextToProcess) => {
  return {
    summary: `Automated processing fallback.`,
    businessRequirements: ["Improve operational efficiency."],
    softwareRequirements: ["Develop core CRUD operations."],
    userStories: ["As a user, I want clear feedback."],
    acceptanceCriteria: ["System must deploy without critical errors."],
    riskFactors: ["Scope creep due to vaguely defined initial requirements."],
    ambiguousTerms: [{ term: "system", suggestion: "Can you provide more specific details regarding this?" }],
    suggestedQuestions: ["Could you clarify the main objective?"],
    processedText: rawTextToProcess
  };
};

const processRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await BARequirementModel.getRequirementByReqId(id);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const reqData = reqDoc.data;

    // If already processed, just update status
    if (reqData.aiProcessedData) {
      if (reqData.status === "Pending BA Review") {
         await BARequirementModel.updateAIAnalysis(id, reqData.aiProcessedData, true);
      }
      return res.json({ success: true, data: reqData.aiProcessedData, reqDetails: { ...reqData, status: "In Analysis" } });
    }

    const rawTextToProcess = reqData.description || reqData.text || "Empty requirement.";
    let aiProcessedData;
    try { 
      const prompt = `You are a senior Business Analyst AI... Respond ONLY with JSON: {"summary": "", "businessRequirements": [""], "softwareRequirements": [""], "userStories": [""], "acceptanceCriteria": [""], "riskFactors": [""], "ambiguousTerms": [{"term": "", "suggestion": ""}], "suggestedQuestions": [""]}`;
      aiProcessedData = await callOpenAI(rawTextToProcess, prompt); 
      aiProcessedData.processedText = rawTextToProcess;
    } catch (e) { aiProcessedData = getFallbackAIData(rawTextToProcess); }

    const updatedData = await BARequirementModel.updateAIAnalysis(id, aiProcessedData, true);
    res.json({ success: true, data: aiProcessedData, reqDetails: updatedData });
  } catch (error) { res.status(500).json({ success: false }); }
};

const regenerateRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await BARequirementModel.getRequirementByReqId(id);
    if (!reqDoc) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const rawTextToProcess = reqDoc.data.description || reqDoc.data.text || "Empty requirement.";
    let aiProcessedData;
    try { 
      const prompt = `You are a senior Business Analyst AI... Respond ONLY with JSON: {"summary": "", "businessRequirements": [""], "softwareRequirements": [""], "userStories": [""], "acceptanceCriteria": [""], "riskFactors": [""], "ambiguousTerms": [{"term": "", "suggestion": ""}], "suggestedQuestions": [""]}`;
      aiProcessedData = await callOpenAI(rawTextToProcess, prompt); 
      aiProcessedData.processedText = rawTextToProcess;
    } catch (e) { aiProcessedData = getFallbackAIData(rawTextToProcess); }

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

// --- 3. CLARIFICATIONS ---
const sendClarificationQuestions = async (req, res) => {
  try {
    await BACommunicationModel.sendClarificationQuestions(req.body.reqId, req.body.questions);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getReqClarifications = async (req, res) => {
  try {
    const clarifications = await BACommunicationModel.getClarifications(req.params.id);
    res.json({ success: true, data: clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 4. TASK GENERATION & ASSIGNMENT ---
const getReadyRequirements = async (req, res) => {
  try {
    const data = await BATaskModel.getReadyRequirements();
    res.json({ success: true, data: data.reqs, globalTaskCount: data.globalTaskCount });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getDevelopers = async (req, res) => {
  try {
    const devs = await BATaskModel.getDevelopers();
    res.json({ success: true, data: devs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const generateTasksWithAI = async (req, res) => {
  try {
    const { reqId } = req.params;
    const { aiProcessedData } = req.body;
    let generatedTasks = [];

    if (process.env.OPENAI_API_KEY && aiProcessedData) {
      try {
        const prompt = `Break down ONLY the specific requirements into 4-8 technical tasks. Summary: ${aiProcessedData.summary}. Features: ${aiProcessedData.softwareRequirements.join(". ")}. Respond ONLY with JSON array: [{"title": "Precise technical task", "priority": "High", "requiredRole": "Back-end Developer"}]`;
        generatedTasks = await callOpenAI("Generate tasks.", prompt);
      } catch(e) { /* fallback below */ }
    } 
    
    if(generatedTasks.length === 0) {
      generatedTasks = [
        { title: "Design database schema for new features", priority: "High", requiredRole: "Database Developer" },
        { title: "Implement core API functionality", priority: "High", requiredRole: "Back-end Developer" }
      ];
    }

    // Model handles clearing old tasks and saving the new ones
    const savedTasks = await BATaskModel.clearAndSaveAITasks(reqId, generatedTasks);
    res.json({ success: true, data: savedTasks });
  } catch (error) { res.status(500).json({ success: false }); }
};

const saveAssignedTasks = async (req, res) => {
  try {
    await BATaskModel.assignTasks(req.body.reqId, req.body.tasks);
    res.json({ success: true, message: "Tasks assigned successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { 
  getDashboardOverview, getInboxRequirements, searchAllItems, getAnalyzedHistory, 
  processRequirementWithAI, regenerateRequirementWithAI, saveEditedAIAnalysis, 
  sendClarificationQuestions, getReqClarifications,
  getReadyRequirements, getDevelopers, generateTasksWithAI, saveAssignedTasks
};