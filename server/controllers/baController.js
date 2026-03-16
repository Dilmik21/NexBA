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
      db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} })), 
      db.collection('messages').where('senderRole', '==', 'Developer').get().catch(() => ({ empty: true, forEach: () => {} })) 
    ]);
    
    let pendingReviews = 0, verificationQueueCount = 0, criticalRisks = 0, activeReqs = 0;
    let rawInbox = [], rawChangeRequests = [], rawVerificationQueue = []; 
    
    let devLoadMap = {};
    devsSnapshot.forEach(doc => {
      const dev = doc.data();
      devLoadMap[dev.fullName] = { name: dev.fullName, count: 0 };
    });

    let reqTaskStatusMap = {}; 

    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        
        // Developer Workload logic
        const isTaskActive = ['To Do', 'In Progress', 'In Review'].includes(task.status);
        if (isTaskActive && task.assigneeName && devLoadMap[task.assigneeName]) {
          devLoadMap[task.assigneeName].count++;
        }

        // Map tasks to their requirement ID
        if (task.reqId) {
          if (!reqTaskStatusMap[task.reqId]) reqTaskStatusMap[task.reqId] = [];
          reqTaskStatusMap[task.reqId].push(task.status || "Unassigned");
        }
      });
    }

    // DEFINING "WORK IN PROGRESS" STATUSES (Starts from In Analysis)
    const inProgressStatuses = [
      "In Analysis", 
      "Clarification Needed", 
      "Tasks Assigned", 
      "In Progress", 
      "Awaiting Verification", 
      "Pending Verification", 
      "Modification Requested"
    ];

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      const clientName = getClientName(data);
      
      if (data.status === "Pending BA Review") {
        pendingReviews++; 
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt), isNew: true });
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

      // --- DYNAMIC ACTIVE REQUIREMENT LOGIC ---
      // If the requirement has reached at least the "In Analysis" stage
      if (inProgressStatuses.includes(data.status)) {
        
        let isFullyFinished = false;
        const reqTasks = reqTaskStatusMap[rawReqId];

        if (reqTasks && reqTasks.length > 0) {
          // If it has tasks, check if 100% of them are Client Accepted
          isFullyFinished = reqTasks.every(status => 
            ['Client Accepted', 'Completed', 'Done'].includes(status)
          );
        }

        // If it is NOT fully finished, it means it is still ACTIVE!
        if (!isFullyFinished) {
          activeReqs++;
        }
      }
    });

    let developerLoad = Object.values(devLoadMap);
    if (developerLoad.length === 0) {
      developerLoad = [
        { name: "Naveen Dilhan", count: 7 }, 
        { name: "Dewni Witharana", count: 5 }, 
        { name: "Sheran Ashintha", count: 4 }
      ];
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

const getInboxRequirements = async (req, res) => {
  try {
    const reqSnapshot = await db.collection('requirements').where('status', 'in', ['Pending BA Review', 'In Analysis', 'Clarification Needed']).get();
    let inbox = [];
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      inbox.push({
        dbId: doc.id, id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, title: data.title || 'Untitled Requirement', description: data.description || data.text || 'No description provided.', submitter: getClientName(data), company: data.company || data.companyName || 'Cargills Corporation', priority: getPriority(data), type: (data.fileUrl || data.fileName || data.attachments || data.type === 'File') ? 'File' : 'Text', fileName: data.fileName || 'document.pdf', fileUrl: data.fileUrl || null, fullDate: formatFullDate(data.submittedAt), timeAgo: getTimeAgo(data.submittedAt), rawDate: data.submittedAt || 0, isNew: data.status === 'Pending BA Review' 
      });
    });
    inbox.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0);
    });
    res.json({ success: true, data: inbox });
  } catch (error) { res.status(500).json({ success: false }); }
};

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
  } catch (error) { res.status(500).json({ success: false }); }
};

const getAnalyzedHistory = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').get();
    let history = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aiProcessedData) {
        history.push({ id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, title: data.title || 'Untitled', rawDate: data.submittedAt || 0 });
      }
    });
    history.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    res.json({ success: true, data: history });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getFallbackAIData = (rawTextToProcess, reqTitle) => {
  const potentialAmbiguities = [
    { term: "user-friendly", suggestion: "Define specific accessibility standards or UI metrics." },
    { term: "quick", suggestion: "Specify exact time limit (e.g., < 2 seconds)." },
    { term: "fast", suggestion: "Specify latency overhead (e.g., < 50ms)." }
  ];
  let foundAmbiguities = potentialAmbiguities.filter(a => rawTextToProcess.toLowerCase().includes(a.term.toLowerCase()));
  if (foundAmbiguities.length === 0) foundAmbiguities = [{ term: "system", suggestion: "Can you provide more specific details regarding this?" }];

  return {
    summary: `Automated processing of: ${reqTitle || 'Client Requirement'}.`,
    businessRequirements: ["Improve operational efficiency."],
    softwareRequirements: ["Develop core CRUD operations."],
    userStories: ["As a user, I want clear feedback."],
    acceptanceCriteria: ["System must deploy without critical errors."],
    riskFactors: ["Scope creep due to vaguely defined initial requirements."],
    ambiguousTerms: foundAmbiguities,
    suggestedQuestions: foundAmbiguities.map(a => `Could you clarify what you mean by "${a.term}"?`),
    processedText: rawTextToProcess
  };
};

const callOpenAI = async (rawText) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
  if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");

  const prompt = `
    You are a senior Business Analyst AI for the NexBA platform. Read the following raw client requirement text and extract structured data.
    Respond ONLY with a valid JSON object containing exactly these keys:
    {"summary": "", "businessRequirements": [""], "softwareRequirements": [""], "userStories": [""], "acceptanceCriteria": [""], "riskFactors": [""], "ambiguousTerms": [{"term": "", "suggestion": ""}], "suggestedQuestions": [""]}
  `;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: prompt }, {role: "user", content: rawText}], temperature: 0.3 })
  });
  if (!response.ok) throw new Error(`OpenAI API failed`);
  const aiResult = await response.json();
  const parsedData = JSON.parse(aiResult.choices[0].message.content);
  parsedData.processedText = rawText; 
  return parsedData;
};

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
    try { aiProcessedData = await callOpenAI(rawTextToProcess); } 
    catch (apiError) { aiProcessedData = getFallbackAIData(rawTextToProcess, reqData.title); }

    await doc.ref.update({ status: "In Analysis", aiProcessedData: aiProcessedData });
    res.json({ success: true, data: aiProcessedData, reqDetails: { ...reqData, status: "In Analysis" } });
  } catch (error) { res.status(500).json({ success: false }); }
};

const regenerateRequirementWithAI = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.collection('requirements').where('reqId', '==', id).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: "Requirement not found" });
    const doc = snapshot.docs[0];
    let aiProcessedData;
    try { aiProcessedData = await callOpenAI(doc.data().description || "Empty"); } 
    catch (apiError) { aiProcessedData = getFallbackAIData(doc.data().description, doc.data().title); }
    await doc.ref.update({ aiProcessedData: aiProcessedData });
    res.json({ success: true, data: aiProcessedData });
  } catch (error) { res.status(500).json({ success: false }); }
};

const saveEditedAIAnalysis = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').where('reqId', '==', req.params.id).get();
    if (!snapshot.empty) await snapshot.docs[0].ref.update({ aiProcessedData: req.body });
    res.json({ success: true, data: req.body });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendClarificationQuestions = async (req, res) => {
  try {
    const { reqId, questions } = req.body;
    const batch = db.batch();
    questions.forEach(q => {
      batch.set(db.collection('clarifications').doc(), { reqId: reqId, question: q, status: "Pending Client", source: "BA", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) batch.update(reqSnapshot.docs[0].ref, { status: "Clarification Needed" });
    await batch.commit();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getReqClarifications = async (req, res) => {
  try {
    const snapshot = await db.collection('clarifications').where('reqId', '==', req.params.id).get();
    let clarifications = [];
    snapshot.forEach(doc => clarifications.push({ id: doc.id, ...doc.data() }));
    clarifications.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
    res.json({ success: true, data: clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

// ============================================================================
// --- TASK & ASSIGNMENT ENDPOINTS ---
// ============================================================================

const getReadyRequirements = async (req, res) => {
  try {
    const reqSnapshot = await db.collection('requirements').where('status', 'in', ['In Analysis', 'Clarification Needed', 'Approved', 'Tasks Assigned']).get();
    
    const tasksSnap = await db.collection('tasks').where('status', '==', 'Unassigned').get().catch(() => ({ empty: true, forEach: () => {} }));
    let unassignedMap = {};
    if (!tasksSnap.empty) {
      tasksSnap.forEach(doc => {
        const t = doc.data();
        if (!unassignedMap[t.reqId]) unassignedMap[t.reqId] = [];
        t.displayId = t.taskId; 
        unassignedMap[t.reqId].push(t);
      });
    }

    const lastTaskSnap = await db.collection('tasks').orderBy('taskId', 'desc').limit(1).get();
    let globalTaskCount = 500; 
    if (!lastTaskSnap.empty) {
      const lastIdStr = lastTaskSnap.docs[0].data().taskId || 'TASK-500';
      const lastNum = parseInt(lastIdStr.replace('TASK-', ''));
      if (!isNaN(lastNum)) globalTaskCount = lastNum;
    }

    let reqs = [];
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (data.aiProcessedData) {
        reqs.push({
          id: rawReqId,
          title: data.title || "Untitled Requirement",
          status: data.status || "In Analysis",
          aiProcessedData: data.aiProcessedData,
          unassignedTasks: unassignedMap[rawReqId] || [] 
        });
      }
    });

    res.json({ success: true, data: reqs, globalTaskCount: globalTaskCount });
  } catch (error) {
    console.error("[Backend Error - getReadyRequirements]:", error);
    res.status(500).json({ success: false });
  }
};

const getDevelopers = async (req, res) => {
  try {
    const devsSnapshot = await db.collection('users').where('role', '==', 'Developer').get();
    const tasksSnapshot = await db.collection('tasks').where('status', 'in', ['To Do', 'In Progress', 'In Review']).get().catch(() => ({ empty: true, forEach: () => {} }));

    let loadMap = {};
    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const t = doc.data();
        if (t.assigneeId) loadMap[t.assigneeId] = (loadMap[t.assigneeId] || 0) + 1;
      });
    }

    let developers = [];
    devsSnapshot.forEach(doc => {
      const data = doc.data();
      developers.push({
        id: doc.id,
        fullName: data.fullName || data.name || "Unknown Dev",
        skills: data.skills || "Full-stack Developer",
        initials: (data.fullName || "D").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(),
        currentLoad: loadMap[doc.id] || 0,
        maxLoad: 10
      });
    });

    if (developers.length === 0) {
      developers = [
        { id: "dev1", fullName: "Sheran Ashintha", skills: "Front-end Developer", currentLoad: 2, maxLoad: 10, initials: "SA" },
        { id: "dev2", fullName: "Shenon Lekamge", skills: "Full-stack Developer", currentLoad: 3, maxLoad: 10, initials: "SL" },
        { id: "dev3", fullName: "Induranga Dilshan", skills: "Database Developer", currentLoad: 4, maxLoad: 10, initials: "ID" }
      ];
    }
    developers.sort((a, b) => a.currentLoad - b.currentLoad);
    res.json({ success: true, data: developers });
  } catch (error) { res.status(500).json({ success: false }); }
};

const generateTasksWithAI = async (req, res) => {
  try {
    const { reqId } = req.params;
    const { aiProcessedData } = req.body;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const existingUnassigned = await db.collection('tasks').where('reqId', '==', reqId).where('status', '==', 'Unassigned').get();
    if (!existingUnassigned.empty) {
      const deleteBatch = db.batch();
      existingUnassigned.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
    }

    let generatedTasks = [];

    if (OPENAI_API_KEY && aiProcessedData) {
      const prompt = `
        You are an expert Technical Project Manager. 
        CRITICAL: Break down ONLY the specific requirements below into 4-8 technical tasks.
        Requirement Summary: ${aiProcessedData.summary}
        Specific Features: ${aiProcessedData.softwareRequirements.join(". ")}
        
        Respond ONLY with a valid JSON array of objects:
        [{"title": "Precise technical task", "priority": "High", "requiredRole": "Back-end Developer"}]
        Roles allowed: Front-end Developer, Back-end Developer, Full-stack Developer, Mobile App Developer, DevOps Engineer, Database Developer, AI/ML Developer.
      `;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: prompt }], temperature: 0.2 })
      });

      if (response.ok) {
        const aiResult = await response.json();
        generatedTasks = JSON.parse(aiResult.choices[0].message.content);
      } else throw new Error("OpenAI API failed");
    } else {
      generatedTasks = [
        { title: "Design database schema for new features", priority: "High", requiredRole: "Database Developer" },
        { title: "Implement core API functionality", priority: "High", requiredRole: "Back-end Developer" }
      ];
    }

    const lastTaskSnap = await db.collection('tasks').orderBy('taskId', 'desc').limit(1).get();
    let currentMax = 500;
    if (!lastTaskSnap.empty) {
      const lastIdStr = lastTaskSnap.docs[0].data().taskId || 'TASK-500';
      const lastNum = parseInt(lastIdStr.replace('TASK-', ''));
      if (!isNaN(lastNum)) currentMax = lastNum;
    }

    const batch = db.batch();
    const savedTasks = [];

    generatedTasks.forEach((task, index) => {
      const newRef = db.collection('tasks').doc();
      
      const nextNum = currentMax + index + 1;
      const formattedNum = String(nextNum).padStart(3, '0');
      const taskId = `TASK-${formattedNum}`;
      
      const taskObj = {
        taskId: taskId,
        displayId: taskId, 
        reqId: reqId,
        title: task.title,
        priority: task.priority || 'Medium',
        requiredRole: task.requiredRole || 'Full-stack Developer',
        status: "Unassigned",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(newRef, taskObj);
      savedTasks.push(taskObj);
    });

    await batch.commit();
    res.json({ success: true, data: savedTasks });
  } catch (error) {
    console.error("[Backend Error - generateTasksWithAI]:", error);
    res.status(500).json({ success: false });
  }
};

const saveAssignedTasks = async (req, res) => {
  try {
    const { reqId, tasks } = req.body;
    
    const lastTaskSnap = await db.collection('tasks').orderBy('taskId', 'desc').limit(1).get();
    let currentMax = 500;
    if (!lastTaskSnap.empty) {
      const lastIdStr = lastTaskSnap.docs[0].data().taskId || 'TASK-500';
      const lastNum = parseInt(lastIdStr.replace('TASK-', ''));
      if (!isNaN(lastNum)) currentMax = lastNum;
    }

    const batch = db.batch();

    for (const task of tasks) {
      if (task.taskId) {
        const taskQuery = await db.collection('tasks').where('taskId', '==', task.taskId).get();
        if (!taskQuery.empty) {
          batch.update(taskQuery.docs[0].ref, {
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            status: "To Do",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        const newRef = db.collection('tasks').doc();
        currentMax++;
        
        const formattedNum = String(currentMax).padStart(3, '0');
        const taskId = `TASK-${formattedNum}`;

        batch.set(newRef, {
          taskId: taskId,
          reqId: reqId,
          title: task.title,
          priority: task.priority || 'Medium',
          requiredRole: task.requiredRole || 'Full-stack Developer',
          assigneeId: task.assigneeId,
          assigneeName: task.assigneeName,
          status: "To Do",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) batch.update(reqSnapshot.docs[0].ref, { status: "Tasks Assigned" });

    await batch.commit();
    res.json({ success: true, message: "Tasks assigned successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { 
  getDashboardOverview, getInboxRequirements, searchAllItems, getAnalyzedHistory, 
  processRequirementWithAI, regenerateRequirementWithAI, saveEditedAIAnalysis, sendClarificationQuestions, getReqClarifications,
  getReadyRequirements, getDevelopers, generateTasksWithAI, saveAssignedTasks
};