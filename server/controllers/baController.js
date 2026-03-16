const { admin, db } = require('../config/firebase');

// --- SMART HELPERS ---
const getTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return "Just now";
};

const formatShortDate = (timestamp) => {
  if (!timestamp) return "Unknown Date";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDate = (timestamp) => {
  if (!timestamp) return "Unknown Date";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getClientName = (data) => {
  return data.clientName || data.submittedBy || data.userFullName || data.userName || data.fullName || "Unknown Client";
};

const getPriority = (data) => {
  const rawPriority = (data.priority || data.priorityLevel || "Medium").toLowerCase();
  if (rawPriority.includes("high") || rawPriority.includes("urgent")) return "High";
  if (rawPriority.includes("low")) return "Low";
  return "Medium";
};

const getChangeRisk = (data) => {
  const rawRisk = (data.changeRisk || data.riskLevel || data.risk || "Medium").toLowerCase();
  if (rawRisk.includes("high") || rawRisk.includes("critical")) return "High";
  if (rawRisk.includes("low")) return "Low";
  return "Medium";
};

// --- 1. GET BA DASHBOARD OVERVIEW ---
const getDashboardOverview = async (req, res) => {
  try {
    const [reqSnapshot, devsSnapshot, tasksSnapshot, messagesSnapshot] = await Promise.all([
      db.collection('requirements').get(),
      db.collection('users').where('role', '==', 'Developer').get(),
      db.collection('tasks').where('status', 'in', ['To Do', 'In Progress', 'In Review']).get().catch(() => ({ empty: true, forEach: () => {} })), 
      db.collection('messages').where('senderRole', '==', 'Developer').get().catch(() => ({ empty: true, forEach: () => {} })) 
    ]);
    
    let pendingReviews = 0;
    let verificationQueueCount = 0;
    let criticalRisks = 0;
    let activeReqs = 0;
    
    let rawInbox = []; 
    let rawChangeRequests = [];
    let rawVerificationQueue = []; 
    
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      const clientName = getClientName(data);
      
      if (data.status === "Pending BA Review") {
        pendingReviews++; 
        rawInbox.push({ 
          id: rawReqId, 
          title: data.title || "Untitled Request", 
          client: clientName, 
          rawDate: data.submittedAt || 0, 
          time: getTimeAgo(data.submittedAt),
          isNew: true 
        });
      }

      if (data.status === "Modification Requested") {
        const changeRisk = getChangeRisk(data);
        if (changeRisk === "High") criticalRisks++;

        rawChangeRequests.push({ id: rawReqId, title: data.lastChangeType ? `${data.lastChangeType} — "${data.title}"` : `Change Request — "${data.title}"`, from: clientName, time: getTimeAgo(data.changeRequestedAt || data.submittedAt), risk: changeRisk, rawDate: data.changeRequestedAt || data.submittedAt || 0 });
      }
      
      if (data.status === "Awaiting Verification" || data.status === "Pending Verification") {
        verificationQueueCount++;
        rawVerificationQueue.push({ id: rawReqId, title: data.title || "Untitled Update", dev: data.developerName || data.assignedTo || "Unknown Developer", date: formatShortDate(data.verificationSubmittedAt || data.submittedAt), rawDate: data.verificationSubmittedAt || data.submittedAt || 0 });
      }

      if (data.status === "In Analysis" || data.status === "In Progress") activeReqs++;
    });

    let devLoadMap = {};
    devsSnapshot.forEach(doc => {
      const dev = doc.data();
      devLoadMap[dev.fullName] = { name: dev.fullName, count: 0 };
    });

    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        if (task.assignee && devLoadMap[task.assignee]) devLoadMap[task.assignee].count++;
      });
    }

    let developerLoad = Object.values(devLoadMap);
    if (developerLoad.length === 0) {
      developerLoad = [{ name: "Naveen Dilhan", count: 7 }, { name: "Dewni Witharana", count: 5 }, { name: "Sheran Ashintha", count: 4 }];
    }
    developerLoad.sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...developerLoad.map(d => d.count), 8);
    developerLoad = developerLoad.map(dev => {
      let color = "bg-[#10B981]", textColor = "text-white";
      if (dev.count >= 7) { color = "bg-gray-100"; textColor = "text-gray-400"; } 
      else if (dev.count >= 5) { color = "bg-yellow-500"; } 
      else if (dev.count >= 4) { color = "bg-[#0A66C2]"; }
      return { name: dev.name, count: dev.count, color: color, textColor: textColor, widthPercent: Math.max((dev.count / maxCount) * 100, 5) };
    });

    let rawDeveloperUpdates = [];
    if (!messagesSnapshot.empty) {
      messagesSnapshot.forEach(doc => {
        const msg = doc.data();
        rawDeveloperUpdates.push({ initials: msg.senderName ? msg.senderName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "DEV", color: "bg-green-500", name: msg.senderName || "Unknown Developer", task: msg.taskId || "General", message: msg.text || msg.message || "", rawDate: msg.createdAt || msg.timestamp || 0, time: getTimeAgo(msg.createdAt || msg.timestamp) });
      });
    }

    rawInbox.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    rawChangeRequests.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    rawVerificationQueue.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    rawDeveloperUpdates.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));

    res.json({ success: true, data: { stats: { pendingReviews, verificationQueue: verificationQueueCount, criticalRisks, activeRequirements: activeReqs }, inbox: rawInbox.slice(0, 3), changeRequests: rawChangeRequests.slice(0, 3), developerLoad: developerLoad, verificationQueue: rawVerificationQueue.slice(0, 4), developerUpdates: rawDeveloperUpdates.slice(0, 3) } });
  } catch (error) {
    console.error("[Backend Error - BA Overview]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 2. GET REQUIREMENT INBOX PAGE DATA ---
const getInboxRequirements = async (req, res) => {
  try {
    const reqSnapshot = await db.collection('requirements').where('status', 'in', ['Pending BA Review', 'In Analysis', 'Clarification Needed']).get();
    let inbox = [];
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      inbox.push({
        dbId: doc.id,
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title || 'Untitled Requirement',
        description: data.description || data.text || 'No description provided.',
        submitter: getClientName(data),
        company: data.company || data.companyName || 'Cargills Corporation', 
        priority: getPriority(data), 
        type: (data.fileUrl || data.fileName || data.attachments || data.type === 'File') ? 'File' : 'Text',
        fileName: data.fileName || 'document.pdf',
        fileUrl: data.fileUrl || null,
        fullDate: formatFullDate(data.submittedAt),
        timeAgo: getTimeAgo(data.submittedAt),
        rawDate: data.submittedAt || 0,
        isNew: data.status === 'Pending BA Review' 
      });
    });

    inbox.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0);
    });

    res.json({ success: true, data: inbox });
  } catch (error) {
    console.error("[Backend Error - BA Inbox]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 3. BA SEARCH ---
const searchAllItems = async (req, res) => {
  try {
    const rawQuery = req.query.q || '';
    if (!rawQuery.trim()) return res.json({ success: true, data: [] });
    const cleanQuery = rawQuery.toLowerCase().replace(/[\s-]/g, '');
    let searchResults = [];

    const [reqSnapshot, taskSnapshot] = await Promise.all([
      db.collection('requirements').get(),
      db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }))
    ]);

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (rawReqId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(rawQuery.toLowerCase()))) {
        searchResults.push({ id: rawReqId, title: data.title || 'Untitled', status: data.status || 'Unknown', type: "Requirement" });
      }
    });

    res.json({ success: true, data: searchResults });
  } catch (error) {
    console.error("[Backend Error - BA Search]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 4. GET PREVIOUSLY ANALYZED HISTORY ---
const getAnalyzedHistory = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').get();
    let history = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aiProcessedData) {
        history.push({
          id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
          title: data.title || 'Untitled',
          rawDate: data.submittedAt || 0
        });
      }
    });

    history.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    res.json({ success: true, data: history });
  } catch (error) {
    console.error("[Backend Error - History]:", error);
    res.status(500).json({ success: false });
  }
};

// --- SMART FALLBACK HELPER ---
const getFallbackAIData = (rawTextToProcess, reqTitle) => {
  const potentialAmbiguities = [
    { term: "user-friendly", suggestion: "Define specific accessibility standards or UI metrics." },
    { term: "quick", suggestion: "Specify exact time limit (e.g., < 2 seconds)." },
    { term: "fast", suggestion: "Specify latency overhead (e.g., < 50ms)." },
    { term: "real-time", suggestion: "Clarify acceptable delay margin (e.g., near real-time < 500ms)." },
    { term: "comprehensive", suggestion: "List exactly which fields and columns must be included." },
    { term: "secure", suggestion: "Define exact encryption standard (e.g., AES-256, TLS 1.3)." },
    { term: "efficient", suggestion: "Define the metric for efficiency (e.g., 50% less processing time)." }
  ];

  let foundAmbiguities = potentialAmbiguities.filter(a => rawTextToProcess.toLowerCase().includes(a.term.toLowerCase()));

  if (foundAmbiguities.length === 0) {
    const words = rawTextToProcess.split(" ").filter(w => w.length > 5);
    const targetWord = words.length > 0 ? words[0].replace(/[.,]/g, '') : "system";
    foundAmbiguities = [{ term: targetWord, suggestion: "Can you provide more specific details regarding this?" }];
  }

  return {
    summary: `Automated processing of: ${reqTitle || 'Client Requirement'}. The system will restructure operations to meet client needs.`,
    businessRequirements: ["Improve operational efficiency.", "Digitize manual workflows."],
    softwareRequirements: ["Develop core CRUD operations.", "Implement required notifications."],
    userStories: ["As a user, I want clear feedback when my action is successful so I know it worked."],
    acceptanceCriteria: ["System must deploy without critical errors."],
    riskFactors: ["Scope creep due to vaguely defined initial requirements."],
    ambiguousTerms: foundAmbiguities,
    suggestedQuestions: foundAmbiguities.map(a => `Could you clarify what you mean by "${a.term}"?`),
    processedText: rawTextToProcess
  };
};

// --- REAL OPENAI API CALL LOGIC ---
const callOpenAI = async (rawText) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

  if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");

  // STRICTER PROMPT to prevent hallucinations
  const prompt = `
    You are a senior Business Analyst AI for the NexBA platform. 
    Read the following raw client requirement text and extract structured data.
    
    CRITICAL INSTRUCTIONS:
    1. ONLY extract information directly from the provided text. DO NOT invent features, modules, or requirements that are not mentioned.
    2. If the text is short, extract what you can and leave arrays empty if not applicable.
    3. You MUST find at least 1 or 2 ambiguous terms in the text (like 'efficient', 'fast', 'secure', 'manage', 'support', 'large', 'soon').
    4. For "suggestedQuestions", generate 2 to 4 highly specific questions asking the client to clarify the ambiguous terms or missing constraints *only* related to the provided text.

    Requirement Text:
    "${rawText}"
    
    Respond ONLY with a valid, raw JSON object containing the exact following keys:
    {
      "summary": "A brief 1-2 sentence professional summary of the text.",
      "businessRequirements": ["Array of high level business goals derived from the text"],
      "softwareRequirements": ["Array of technical system features derived from the text"],
      "userStories": ["As a [user], I want [feature] so that [reason]"],
      "acceptanceCriteria": ["Array of measurable success conditions"],
      "riskFactors": ["Array of potential project risks based ONLY on the text"],
      "ambiguousTerms": [
        {"term": "exact ambiguous word from text", "suggestion": "Why it's vague and what to clarify"}
      ],
      "suggestedQuestions": ["Array of questions to ask the client to clarify the ambiguous terms or missing info"]
    }
  `;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3 // Lower temperature for more accuracy and strict adherence to text
    })
  });

  if (!response.ok) throw new Error(`OpenAI API failed: ${response.statusText}`);

  const aiResult = await response.json();
  const parsedData = JSON.parse(aiResult.choices[0].message.content);
  parsedData.processedText = rawText; 
  return parsedData;
};

// --- 5. PROCESS REQUIREMENT WITH AI ---
const processRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.collection('requirements').where('reqId', '==', id).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const doc = snapshot.docs[0];
    const reqData = doc.data();

    if (reqData.aiProcessedData) {
      if (reqData.status === "Pending BA Review") await doc.ref.update({ status: "In Analysis" });
      return res.json({ success: true, data: reqData.aiProcessedData, reqDetails: { ...reqData, status: "In Analysis" } });
    }

    const rawTextToProcess = reqData.description || reqData.text || "Empty requirement.";
    let aiProcessedData;

    try {
      aiProcessedData = await callOpenAI(rawTextToProcess);
    } catch (apiError) {
      console.warn("OpenAI call failed or key missing. Falling back to mock data.", apiError.message);
      aiProcessedData = getFallbackAIData(rawTextToProcess, reqData.title);
    }

    await doc.ref.update({ status: "In Analysis", aiProcessedData: aiProcessedData });

    res.json({ success: true, data: aiProcessedData, reqDetails: { ...reqData, status: "In Analysis" } });
  } catch (error) {
    console.error("[Backend Error - AI Processing]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 6. FORCE REGENERATE REQUIREMENT WITH AI ---
const regenerateRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.collection('requirements').where('reqId', '==', id).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const doc = snapshot.docs[0];
    const reqData = doc.data();
    const rawTextToProcess = reqData.description || reqData.text || "Empty requirement.";
    
    let aiProcessedData;
    
    try {
      aiProcessedData = await callOpenAI(rawTextToProcess);
    } catch (apiError) {
      console.warn("Regeneration OpenAI fallback triggered.", apiError.message);
      aiProcessedData = getFallbackAIData(rawTextToProcess, reqData.title);
    }

    await doc.ref.update({ aiProcessedData: aiProcessedData });

    res.json({ success: true, data: aiProcessedData });
  } catch (error) {
    console.error("[Backend Error - AI Regeneration]:", error);
    res.status(500).json({ success: false, message: "Failed to regenerate AI data" });
  }
};

// --- 7. SAVE EDITED AI ANALYSIS ---
const saveEditedAIAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const editedData = req.body;

    const snapshot = await db.collection('requirements').where('reqId', '==', id).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: "Requirement not found" });
    
    const doc = snapshot.docs[0];
    await doc.ref.update({ aiProcessedData: editedData });

    res.json({ success: true, data: editedData });
  } catch (error) {
    console.error("[Backend Error - Saving Edit]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 8. SEND CLARIFICATION QUESTIONS ---
const sendClarificationQuestions = async (req, res) => {
  try {
    const { reqId, questions } = req.body;
    
    const batch = db.batch();
    questions.forEach(q => {
      const newRef = db.collection('clarifications').doc();
      batch.set(newRef, {
        reqId: reqId,
        question: q,
        status: "Pending Client",
        source: "BA",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) {
      batch.update(reqSnapshot.docs[0].ref, { status: "Clarification Needed" });
    }

    await batch.commit();

    res.json({ success: true, message: "Questions sent to client successfully" });
  } catch (error) {
    console.error("[Backend Error - Send Clarifications]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 9. GET CLARIFICATIONS FOR A REQUIREMENT (NEW) ---
const getReqClarifications = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.collection('clarifications').where('reqId', '==', id).get();
    
    let clarifications = [];
    snapshot.forEach(doc => {
      clarifications.push({ id: doc.id, ...doc.data() });
    });

    // Sort newest first
    clarifications.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });

    res.json({ success: true, data: clarifications });
  } catch (error) {
    console.error("[Backend Error - Get Req Clarifications]:", error);
    res.status(500).json({ success: false });
  }
};

module.exports = { 
  getDashboardOverview, 
  getInboxRequirements, 
  searchAllItems, 
  getAnalyzedHistory, 
  processRequirementWithAI, 
  regenerateRequirementWithAI,
  saveEditedAIAnalysis,
  sendClarificationQuestions,
  getReqClarifications // <-- Exported new function
};