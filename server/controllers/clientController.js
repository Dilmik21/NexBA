const { admin, db } = require('../config/firebase');

// --- 1. SUBMIT NEW PROJECT ---
const submitProject = async (req, res) => {
  try {
    const projectData = req.body;
    
    const uid = projectData.uid || req.query.uid; 

    let clientName = "Unknown Client";
    let companyName = "Unknown Company";

    if (uid) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        clientName = userData.fullName || userData.name || "Unknown Client";
        companyName = userData.organization || userData.company || "Cargills Corporation";
      }
    }

    const snapshot = await db.collection('requirements').count().get();
    const currentCount = snapshot.data().count;
    const customReqId = `REQ-${1001 + currentCount}`; 

    const rawRisk = (projectData.priority || projectData.riskLevel || projectData.risk || "Medium").toLowerCase();
    let normalizedRisk = "Medium";
    if (rawRisk.includes("high") || rawRisk.includes("critical") || rawRisk.includes("urgent")) {
      normalizedRisk = "High";
    } else if (rawRisk.includes("low")) {
      normalizedRisk = "Low";
    }
    
    const newRequirement = {
      ...projectData,                     
      reqId: customReqId,
      clientName: clientName,             
      submittedBy: clientName,            
      company: companyName,               
      riskLevel: normalizedRisk,          
      risk: normalizedRisk,               
      type: projectData.type || (projectData.fileUrl ? 'File' : 'Text'),
      status: "Pending BA Review", 
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0
    };

    const docRef = await db.collection('requirements').add(newRequirement);

    await db.collection('activity_logs').add({
      user: clientName, 
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

// --- 2. OVERVIEW STATS (FIXED) ---
const getOverviewStats = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').get();
    let stats = { totalActive: 0, pendingApprovals: 0, inAnalysis: 0, clarificationsNeeded: 0 };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.totalActive++; 
      
      if (data.status === "Pending Approval") stats.pendingApprovals++;
      
      // THE FIX: Now it ONLY counts if the BA has started processing it with AI!
      if (data.status === "In Analysis") stats.inAnalysis++;
      
      if (data.status === "Clarification Needed") stats.clarificationsNeeded++;
    });

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// --- 3. PROJECT PROGRESS ---
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

// --- 4. CHANGE REQUESTS ---
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

// --- 5. ACTION ITEMS ---
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

// --- 6. RECENT ACTIVITY ---
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

// --- 7. SEARCH ---
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
        priority: data.priority || data.riskLevel || 'Medium',
        rawDbId: doc.id,
        description: data.description || "No description provided.",
        fileName: data.fileName || "No file attached",
        baName: data.baName || "Bhashi Fernando"
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
      status: "Approved & Live",
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
        reqId: data.reqId || "GLOBAL",
        text: data.text || "",
        fileName: data.fileName || null,
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
      fileName: fileName || null,
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

// --- ARCHIVE: GET ALL COMPLETED / CLOSED ---
const getArchivedRequirements = async (req, res) => {
  try {
    const snapshot = await db.collection('requirements')
      .where('status', 'in', ['Approved & Live', 'Closed — Superseded', 'Approved', 'Completed']).get();
    
    let archives = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      let submittedDate = "Unknown";
      let completedDate = "Unknown";
      let rawDate = 0;

      if (data.submittedAt) {
        const dateObj = data.submittedAt.toDate();
        rawDate = dateObj.getTime();
        submittedDate = dateObj.toISOString().split('T')[0];
      }
      if (data.approvedAt) {
        const dateObj = data.approvedAt.toDate();
        completedDate = dateObj.toISOString().split('T')[0];
      } else if (data.submittedAt) {
        const dateObj = data.submittedAt.toDate();
        dateObj.setDate(dateObj.getDate() + 14); 
        completedDate = dateObj.toISOString().split('T')[0];
      }

      archives.push({
        id: doc.id,
        reqId: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title || 'Untitled Feature',
        submittedAt: submittedDate,
        completedAt: completedDate,
        developer: data.submittedBy || 'Naveen Dilhan', 
        status: data.status === 'Approved' ? 'Approved & Live' : (data.status || 'Approved & Live'),
        evidenceImage: data.evidenceImage || null,
        commitLink: data.commitLink || 'github.com/nexba/core/commit/a3f8c21',
        description: data.description || 'No description provided.',
        rawDate: rawDate
      });
    });

    archives.sort((a, b) => b.rawDate - a.rawDate);
    res.json({ success: true, data: archives });
  } catch (error) {
    console.error("[Backend Error - getArchivedRequirements]:", error);
    res.status(500).json({ success: false });
  }
};

// --- SETTINGS: GET REAL SETTINGS ---
const getSettings = async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "No UID provided" });
    }

    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      const initialData = {
        fullName: "",
        email: "", 
        organization: "",
        role: "Client",
        profileImage: null, 
        notifications: {
          email: true,
          inApp: true,
          weeklyDigest: false
        }
      };
      await docRef.set(initialData);
      return res.json({ success: true, data: initialData });
    }

    res.json({ success: true, data: doc.data() });
  } catch (error) {
    console.error("[Backend Error - getSettings]:", error);
    res.status(500).json({ success: false });
  }
};

// --- SETTINGS: UPDATE GENERAL ---
const updateGeneralSettings = async (req, res) => {
  try {
    const { uid, fullName, email, organization, profileImage } = req.body;
    
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });

    await db.collection('users').doc(uid).update({
      fullName, 
      email, 
      organization,
      profileImage: profileImage || null 
    });
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("[Backend Error - updateGeneralSettings]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- SETTINGS: UPDATE SECURITY ---
const updateSecuritySettings = async (req, res) => {
  try {
    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) return res.status(400).json({ success: false, message: "No UID or Password provided" });

    await admin.auth().updateUser(uid, {
      password: newPassword
    });

    res.json({ success: true, message: "Password permanently updated in Firebase Auth" });
  } catch (error) {
    console.error("[Backend Error - updateSecuritySettings]:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

// --- SETTINGS: UPDATE NOTIFICATIONS ---
const updateNotificationSettings = async (req, res) => {
  try {
    const { uid, key, value } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });
    const docRef = db.collection('users').doc(uid);
    await docRef.update({
      [`notifications.${key}`]: value
    });
    res.json({ success: true, message: "Notifications updated successfully" });
  } catch (error) {
    console.error("[Backend Error - updateNotificationSettings]:", error);
    res.status(500).json({ success: false });
  }
};

// ============================================================================
// --- NOTIFICATION ENDPOINTS ---
// ============================================================================

const getNotifications = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });

    const snapshot = await db.collection('notifications')
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    let notifications = [];
    let unreadCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.isRead) unreadCount++;

      let timeStr = "Just now";
      if (data.timestamp) {
          const dateObj = data.timestamp.toDate();
          timeStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      notifications.push({
        id: doc.id,
        title: data.title || "Update",
        message: data.message || "",
        isRead: data.isRead || false,
        time: timeStr
      });
    });

    if (notifications.length === 0) {
      const mockNotif = {
        uid: uid,
        title: "Welcome to NexBA!",
        message: "Your enterprise client dashboard is ready to use. You can submit new requirements from the Requests page.",
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = await db.collection('notifications').add(mockNotif);
      notifications.push({
          id: docRef.id, 
          title: mockNotif.title, 
          message: mockNotif.message, 
          isRead: false, 
          time: "Just now"
      });
      unreadCount = 1;
    }

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("[Backend Error - getNotifications]:", error);
    res.status(500).json({ success: false });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ success: false });

    const snapshot = await db.collection('notifications')
      .where('uid', '==', uid)
      .where('isRead', '==', false)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error("[Backend Error - markNotificationsRead]:", error);
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
  sendMessage,
  getArchivedRequirements,
  getSettings,
  updateGeneralSettings,
  updateSecuritySettings,
  updateNotificationSettings,
  getNotifications,
  markNotificationsRead
};