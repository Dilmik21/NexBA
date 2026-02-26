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
      // UPDATED: Changed from "Pending BA Review" to "Analysis"
      status: "Analysis", 
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0
    };

    const docRef = await db.collection('requirements').add(newRequirement);

    await db.collection('activity_logs').add({
      user: "Client", // You can pass the actual user name from frontend later
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
      // UPDATED: Changed from "Pending BA Review" to "Analysis"
      if (data.status === "Analysis" || data.status === "In Analysis") stats.inAnalysis++;
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

// --- NEW: GET ALL REQUESTS FOR THE TABLE ---
const getAllRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').orderBy('submittedAt', 'desc').get();
    let requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Safely format the Firebase Timestamp into YYYY-MM-DD
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
        // Send these to the frontend for the popup!
        description: data.description || "No description provided.",
        fileName: data.fileName || "No file attached"
      });
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("[Backend Error - getAllRequests]:", error);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  submitProject, getOverviewStats, getProjectProgress, 
  getChangeRequests, getActionItems, getRecentActivity, searchRequirements, getAllRequests
};