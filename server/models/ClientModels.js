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

class RequirementModel {
  static async submitProject(projectData, uid) {
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
      clientId: uid, // STRICT ISOLATION: Locks this requirement to this client
      baId: "",      // Empty so BAs can claim it
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

    await db.collection('requirements').add(newRequirement);

    await db.collection('activity_logs').add({
      clientId: uid, // ISOLATION
      user: clientName, 
      action: `Launched new request: ${projectData.title}`,
      time: admin.firestore.FieldValue.serverTimestamp(),
      dotColor: "bg-blue-500", 
      reqId: customReqId
    });

    return customReqId;
  }

  static async getOverviewStats(uid) {
    const snapshot = await db.collection('requirements').where('clientId', '==', uid).get();
    let stats = { totalActive: 0, pendingApprovals: 0, inAnalysis: 0, clarificationsNeeded: 0 };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.totalActive++; 
      if (data.status === "Pending Approval") stats.pendingApprovals++;
      if (data.status === "In Analysis" || data.status === "Tasks Assigned") stats.inAnalysis++;
      if (data.status === "Clarification Needed") stats.clarificationsNeeded++;
    });
    return stats;
  }

  static async getProjectProgress(uid) {
    const snapshot = await db.collection('requirements').where('clientId', '==', uid).get();
    let requirementsList = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      requirementsList.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, 
        title: data.title,
        stage: data.status,
        progress: data.progress || 0,
        rawDate: data.submittedAt || 0
      });
    });
    
    // Sort in memory to avoid Firebase missing index errors
    requirementsList.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    return requirementsList.slice(0, 5);
  }

  static async getChangeRequests(uid) {
    const snapshot = await db.collection('change_requests')
      .where('clientId', '==', uid)
      .where('status', '!=', 'Resolved').get();
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
    return requests;
  }

  static async getActionItems(uid) {
    const snapshot = await db.collection('requirements')
      .where('clientId', '==', uid)
      .where('status', 'in', ['Pending Approval', 'Clarification Needed']).get();
      
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
    return { pendingApprovals, clarificationsNeeded };
  }

  static async getRecentActivity(uid) {
    const snapshot = await db.collection('activity_logs').where('clientId', '==', uid).get();
    let activities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: data.reqId || doc.id.substring(0, 6),
        action: data.action,
        time: "Recently",
        dotColor: data.dotColor || "bg-gray-400",
        rawDate: data.time || 0
      });
    });

    activities.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    return activities.slice(0, 5);
  }

  static async searchRequirements(searchQuery, uid) {
    const snapshot = await db.collection('requirements').where('clientId', '==', uid).get();
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
    return searchResults;
  }

  static async getAllRequests(uid) {
    const snapshot = await db.collection('requirements').where('clientId', '==', uid).get();
    let requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let formattedDate = "Pending";
      let rawDate = 0;
      if (data.submittedAt) {
        const dateObj = data.submittedAt.toDate();
        formattedDate = dateObj.toISOString().split('T')[0]; 
        rawDate = dateObj.getTime();
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
        baName: data.baName || "Awaiting Assignment",
        rawDate: rawDate
      });
    });

    requests.sort((a, b) => b.rawDate - a.rawDate);
    return requests;
  }

  static async getApprovals(uid) {
    const snapshot = await db.collection('requirements')
      .where('clientId', '==', uid)
      .where('status', '==', 'Awaiting Review').get();
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
    return approvals;
  }

  static async approveRequirement(id) {
    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();
    if (!doc.exists) throw new Error("Requirement not found");

    await requirementRef.update({
      status: "Approved & Live",
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  static async requestChange(id, changeType, changeDescription) {
    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();
    if (!doc.exists) throw new Error("Requirement not found");

    await requirementRef.update({
      status: "Modification Requested",
      changeRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastChangeType: changeType,
      lastChangeDescription: changeDescription
    });
  }

  static async getArchivedRequirements(uid) {
    const snapshot = await db.collection('requirements')
      .where('clientId', '==', uid)
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
    return archives;
  }
}

class CommunicationModel {
  static async getClarifications(uid) {
    // SECURITY: First, get all requirements that belong to THIS specific client
    const reqsSnapshot = await db.collection('requirements').where('clientId', '==', uid).get();
    const requirementsMap = {};
    reqsSnapshot.forEach(doc => {
      const data = doc.data();
      requirementsMap[data.reqId] = data;
    });

    const snapshot = await db.collection('clarifications').get();
    let clarifications = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || "Unknown";
      
      // ONLY push the clarification if the client actually owns the parent requirement!
      if (requirementsMap[reqId]) {
        const parentReq = requirementsMap[reqId];
        let priority = parentReq.priority || parentReq.riskLevel || "Medium";

        clarifications.push({
          id: doc.id,
          reqId: reqId,
          title: parentReq.title || "Untitled Feature",
          baName: data.baName || "Your BA",
          timeAgo: getTimeAgo(data.createdAt),
          rawDate: data.createdAt || 0,
          priority: priority,
          isAI: data.source === "BA", 
          status: data.status || "Pending Client",
          regarding: parentReq.description || "No specific context provided in the original requirement.",
          question: data.question || "Please provide more details.",
          answer: data.answer || "",
          fileName: data.fileName || null, 
          fileData: data.fileData || null  
        });
      }
    });

    clarifications.sort((a, b) => {
      if (a.status === 'Pending Client' && b.status !== 'Pending Client') return -1;
      if (a.status !== 'Pending Client' && b.status === 'Pending Client') return 1;
      const dateA = a.rawDate?.toMillis ? a.rawDate.toMillis() : 0;
      const dateB = b.rawDate?.toMillis ? b.rawDate.toMillis() : 0;
      return dateB - dateA;
    });

    return clarifications;
  }

  static async answerClarification(id, answer, fileName, fileData) {
    const clarificationRef = db.collection('clarifications').doc(id);
    const doc = await clarificationRef.get();
    if (!doc.exists) throw new Error("Clarification not found");

    const updatePayload = {
      answer: answer,
      status: "Answered",
      answeredAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (fileName && fileData) {
      updatePayload.fileName = fileName;
      updatePayload.fileData = fileData;
    }

    await clarificationRef.update(updatePayload);
  }

  static async getMessages(uid) {
    // Isolate messages to only those belonging to this client's UID
    const snapshot = await db.collection('messages')
      .where('clientId', '==', uid)
      .get();
      
    let messages = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let formattedTime = "Just now";
      let rawDate = 0;
      
      if (data.timestamp) {
        const dateObj = data.timestamp.toDate();
        rawDate = dateObj.getTime();
        formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      messages.push({
        id: doc.id,
        reqId: data.reqId || "GLOBAL",
        text: data.text || "",
        fileName: data.fileName || null,
        sender: data.sender || "BA",
        senderName: data.senderName || "Your Team",
        timestamp: formattedTime,
        rawDate: rawDate
      });
    });
    
    // Sort in memory by time
    messages.sort((a, b) => a.rawDate - b.rawDate);
    return messages;
  }

  static async sendMessage(data, uid) {
    const newMessage = {
      text: data.text || "",
      reqId: data.reqId || "GLOBAL",
      clientId: uid, // ISOLATION
      fileName: data.fileName || null,
      sender: data.sender || "Client",
      senderName: data.senderName || "Unknown Client",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('messages').add(newMessage);
    return docRef.id;
  }
}

class UserModel {
  static async getSettings(uid) {
    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      const initialData = {
        fullName: "",
        email: "", 
        organization: "",
        role: "Client",
        profileImage: null, 
        notifications: { email: true, inApp: true, weeklyDigest: false }
      };
      await docRef.set(initialData);
      return initialData;
    }
    return doc.data();
  }

  static async updateGeneralSettings(uid, data) {
    await db.collection('users').doc(uid).update({
      fullName: data.fullName, 
      email: data.email, 
      organization: data.organization,
      profileImage: data.profileImage || null 
    });
  }

  static async updateSecuritySettings(uid, newPassword) {
    await admin.auth().updateUser(uid, { password: newPassword });
  }

  static async updateNotificationSettings(uid, key, value) {
    await db.collection('users').doc(uid).update({
      [`notifications.${key}`]: value
    });
  }

  static async getNotifications(uid) {
    const snapshot = await db.collection('notifications')
      .where('uid', '==', uid).orderBy('timestamp', 'desc').limit(10).get();

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
      notifications.push({ id: docRef.id, title: mockNotif.title, message: mockNotif.message, isRead: false, time: "Just now" });
      unreadCount = 1;
    }

    return { notifications, unreadCount };
  }

  static async markNotificationsRead(uid) {
    const snapshot = await db.collection('notifications')
      .where('uid', '==', uid).where('isRead', '==', false).get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
  }
}

module.exports = { RequirementModel, CommunicationModel, UserModel };