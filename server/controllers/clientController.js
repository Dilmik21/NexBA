const { admin, db } = require('../config/firebase');

// 1. SUBMIT NEW PROJECT
const submitProject = async (req, res) => {
  try {
    const projectData = req.body;
    const snapshot = await db.collection('requirements').count().get();
    const currentCount = snapshot.data().count;
    
    const customReqId = `REQ-${1001 + currentCount}`; 
    
    const newRequirement = {
      ...projectData,
      reqId: customReqId,
      status: "Pending BA Review", 
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0
    };

    const docRef = await db.collection('requirements').add(newRequirement);

    await db.collection('activity_logs').add({
      user: "Client", 
      action: `Launched new request: ${projectData.title}`,
      time: admin.firestore.FieldValue.serverTimestamp(),
      dotColor: "bg-blue-500", 
      reqId: customReqId
    });

    res.json({ success: true, id: customReqId });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
};

// 2. OVERVIEW STATS
const getOverviewStats = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').get();
    let stats = { totalActive: 0, pendingApprovals: 0, inAnalysis: 0, clarificationsNeeded: 0 };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.totalActive++; 
      if (data.status === "Pending Approval") stats.pendingApprovals++;
      if (data.status === "Pending BA Review" || data.status === "In Analysis") stats.inAnalysis++;
      if (data.status === "Clarification Needed") stats.clarificationsNeeded++;
    });

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// 3. PROJECT PROGRESS
const getProjectProgress = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').orderBy('submittedAt', 'desc').limit(5).get();
    let requirementsList = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      requirementsList.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, 
        title: data.title,
        stage: data.status,
        progress: data.progress || 0
      });
    });
    res.json({ success: true, data: { lastUpdated: "Live from Database", requirements: requirementsList } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// 4. CHANGE REQUESTS
const getChangeRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('change_requests').where('status', '!=', 'Resolved').get();
    let requests = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      requests.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: `"${data.title || 'Untitled Update'}"`,
        type: data.type || "Scope Change",
        date: "Submitted recently",
        status: data.impactStatus || "Analyzing Impact...",
        statusColor: data.riskLevel === 'High' ? 'red' : 'yellow'
      });
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// 5. ACTION ITEMS
const getActionItems = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').where('status', 'in', ['Pending Approval', 'Clarification Needed']).get();
    let pendingApprovals = [], clarificationsNeeded = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (data.status === "Pending Approval") {
        pendingApprovals.push({ id: reqId, title: data.title, meta: "Awaiting your review" });
      } else {
        clarificationsNeeded.push({ id: reqId, title: data.title, meta: "Question from BA", quote: data.clarificationQuestion || "Needs more details." });
      }
    });
    res.json({ success: true, data: { pendingApprovals, clarificationsNeeded } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// 6. RECENT ACTIVITY
const getRecentActivity = async (req, res) => {
  try {
    const snapshot = await db.collection('activity_logs').orderBy('time', 'desc').limit(5).get();
    let activities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: data.reqId || doc.id.substring(0, 6),
        action: data.action,
        time: "Recently",
        dotColor: data.dotColor || "bg-gray-400"
      });
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// 7. SEARCH
const searchRequirements = async (req, res) => {
  try {
    const searchQuery = req.query.q?.toLowerCase() || '';
    if (!searchQuery) return res.json({ success: true, data: [] });

    const snapshot = await db.collection('requirements').get();
    let searchResults = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId ? data.reqId.toLowerCase() : `req-${doc.id.substring(0, 4).toLowerCase()}`;
      const title = data.title ? data.title.toLowerCase() : '';

      if (reqId.includes(searchQuery) || title.includes(searchQuery)) {
        searchResults.push({
          id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
          title: data.title,
          status: data.status
        });
      }
    });
    res.json({ success: true, data: searchResults });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// --- GET ALL REQUESTS FOR THE TABLE ---
const getAllRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').orderBy('submittedAt', 'desc').get();
    let requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let formattedDate = "Pending";
      if (data.submittedAt) {
        const dateObj = data.submittedAt.toDate();
        formattedDate = dateObj.toISOString().split('T')[0]; 
      }

      requests.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title,
        type: data.type || 'text',
        date: formattedDate,
        stage: data.status,
        priority: data.priority || 'Medium',
        rawDbId: doc.id,
        description: data.description || "No description provided.",
        fileName: data.fileName || "No file attached",
        baName: data.baName || "Bhashi Fernando" // Adding BA Name for the UI
      });
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("[Backend Error - getAllRequests]:", error);
    res.status(500).json({ success: false });
  }
};

// --- CLARIFICATIONS: GET ALL ---
const getClarifications = async (req, res) => {
  try {
    const snapshot = await db.collection('clarifications').orderBy('createdAt', 'desc').get();
    let clarifications = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      clarifications.push({
        id: doc.id,
        reqId: data.reqId || "REQ-0000",
        title: data.title || "Untitled",
        baName: data.baName || "Bhashi Fernando",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        priority: data.priority || "Medium",
        source: data.source || "BA",
        status: data.status || "Pending",
        regarding: data.regarding || "No specific context provided.",
        question: data.question || "Please provide more details.",
        answer: data.answer || ""
      });
    });

    res.json({ success: true, data: clarifications });
  } catch (error) {
    console.error("[Backend Error - getClarifications]:", error);
    res.status(500).json({ success: false });
  }
};

// --- CLARIFICATIONS: SUBMIT ANSWER ---
const answerClarification = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const clarificationRef = db.collection('clarifications').doc(id);
    const doc = await clarificationRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Clarification not found" });
    }

    await clarificationRef.update({
      answer: answer,
      status: "Answered",
      answeredAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Answer submitted successfully" });
  } catch (error) {
    console.error("[Backend Error - answerClarification]:", error);
    res.status(500).json({ success: false });
  }
};

// --- APPROVALS: GET ALL ---
const getApprovals = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').where('status', '==', 'Awaiting Review').get();
    let approvals = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let formattedDate = "Pending";
      if (data.submittedAt) {
        const dateObj = data.submittedAt.toDate();
        formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      approvals.push({
        id: doc.id,
        reqId: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title || 'Untitled Feature',
        submittedBy: data.submittedBy || 'Naveen Dilhan',
        submittedAt: formattedDate,
        evidenceSubmitted: data.evidenceSubmitted || true, 
        baVerified: data.baVerified || true, 
        evidenceImage: data.evidenceImage || null,
        commitLink: data.commitLink || 'github.com/nexba/core/commit/a3f8c21',
        description: data.description || 'No description provided.'
      });
    });

    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error("[Backend Error - getApprovals]:", error);
    res.status(500).json({ success: false });
  }
};

// --- APPROVALS: SUBMIT APPROVAL ---
const approveRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();

    if (!doc.exists) return res.status(404).json({ success: false, message: "Requirement not found" });

    await requirementRef.update({
      status: "Approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Requirement approved successfully" });
  } catch (error) {
    console.error("[Backend Error - approveRequirement]:", error);
    res.status(500).json({ success: false });
  }
};

// --- APPROVALS: SUBMIT CHANGE REQUEST ---
const requestChangeForRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, changeDescription } = req.body;
    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();

    if (!doc.exists) return res.status(404).json({ success: false, message: "Requirement not found" });

    await requirementRef.update({
      status: "Modification Requested",
      changeRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastChangeType: changeType,
      lastChangeDescription: changeDescription
    });

    res.json({ success: true, message: "Change request submitted successfully" });
  } catch (error) {
    console.error("[Backend Error - requestChangeForRequirement]:", error);
    res.status(500).json({ success: false });
  }
};

// --- MESSAGES: GET ALL ---
const getMessages = async (req, res) => {
  try {
    const snapshot = await db.collection('messages').orderBy('timestamp', 'asc').get();
    let messages = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      let formattedTime = "Just now";
      if (data.timestamp) {
        const dateObj = data.timestamp.toDate();
        formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      messages.push({
        id: doc.id,
        reqId: data.reqId || "GLOBAL", // Maps the message to a project
        text: data.text || "",
        fileName: data.fileName || null, // Handles attachments
        sender: data.sender || "BA",
        senderName: data.senderName || (data.sender === 'Client' ? "Dilmik Rasanjana" : "Bhashi Fernando"),
        timestamp: formattedTime
      });
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("[Backend Error - getMessages]:", error);
    res.status(500).json({ success: false });
  }
};

// --- MESSAGES: SEND NEW MESSAGE ---
const sendMessage = async (req, res) => {
  try {
    const { text, sender, senderName, reqId, fileName } = req.body;
    
    const newMessage = {
      text: text || "",
      reqId: reqId || "GLOBAL",
      fileName: fileName || null, // Save file name if attached
      sender: sender || "Client",
      senderName: senderName || "Dilmik Rasanjana",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('messages').add(newMessage);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("[Backend Error - sendMessage]:", error);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  submitProject, 
  getOverviewStats, 
  getProjectProgress, 
  getChangeRequests, 
  getActionItems, 
  getRecentActivity, 
  searchRequirements, 
  getAllRequests,
  getClarifications,
  answerClarification,
  getApprovals,
  approveRequirement,
  requestChangeForRequirement,
  getMessages,
  sendMessage
};