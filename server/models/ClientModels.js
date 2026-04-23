const { admin, db } = require('../config/firebase');

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

// Centralized array for statuses that mean a project is 100% finished
const finishedStatuses = ['Completed', 'Done', 'Approved & Live', 'Live', 'Closed'];

class RequirementModel {
  static async submitProject(projectData, uid) {
    const safeUid = uid || projectData.uid || "GUEST_USER";

    let clientName = "Unknown Client";
    let companyName = "Unknown Company";

    if (safeUid !== "GUEST_USER") {
      const userDoc = await db.collection('users').doc(safeUid).get();
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
    
    // FIXED: Added fileData to save the actual document content to Firestore
    const newRequirement = {
      title: projectData.title || "Untitled Project",
      description: projectData.description || "No description provided.",
      reqId: customReqId,
      uid: safeUid, 
      baId: "",      
      clientName: clientName,             
      submittedBy: clientName,            
      company: companyName,               
      riskLevel: normalizedRisk,          
      risk: normalizedRisk,               
      priority: normalizedRisk,
      type: projectData.type === 'document' ? 'File' : 'Text',
      status: "Pending BA Review", 
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0,
      fileName: projectData.fileName || null,
      fileData: projectData.fileData || null 
    };

    await db.collection('requirements').add(newRequirement);

    await db.collection('activity_logs').add({
      uid: safeUid,
      user: clientName, 
      action: `Launched new request: ${projectData.title}`,
      time: admin.firestore.FieldValue.serverTimestamp(),
      dotColor: "bg-blue-500", 
      reqId: customReqId
    });

    return customReqId;
  }

  static async getAllRequests(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
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
        type: data.type || 'Text',
        date: formattedDate,
        stage: data.status,
        priority: data.priority || data.riskLevel || 'Medium',
        rawDbId: doc.id,
        description: data.description || "No description provided.",
        fileName: data.fileName || "No file attached",
        // FIXED: Pulling the base64 file data out of Firestore to send to the UI
        fileData: data.fileData || data.fileUrl || null, 
        baName: data.baName || "Awaiting Assignment",
        rawDate: rawDate
      });
    });

    requests.sort((a, b) => b.rawDate - a.rawDate);
    return requests;
  }

  static async getOverviewStats(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
    
    let stats = { 
      totalActive: 0, 
      pendingApprovals: 0, 
      inAnalysis: 0, 
      clarificationsNeeded: 0 
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'Pending BA Review';

      if (!finishedStatuses.includes(status)) {
        stats.totalActive++; 
      }

      if (status === "Client UAT" || status === "Modification Requested" || status === "Change Requested") {
        stats.pendingApprovals++;
      }

      if (status === "Pending BA Review" || status === "In Analysis" || status === "Tasks Assigned") {
        stats.inAnalysis++;
      }

      if (status === "Clarification Needed") {
        stats.clarificationsNeeded++;
      }
    });

    return stats;
  }

  static async getProjectProgress(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
    let requirementsList = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'Pending BA Review';
      
      requirementsList.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, 
        title: data.title,
        stage: status,
        progress: data.progress || 0,
        rawDate: data.submittedAt || 0
      });
    });
    
    requirementsList.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    return requirementsList.slice(0, 5);
  }

  static async getChangeRequests(uid) {
    const safeUid = uid || "INVALID";
    
    const reqsSnapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
    const activeReqIds = new Set();
    reqsSnapshot.forEach(doc => {
      if (!finishedStatuses.includes(doc.data().status)) {
        activeReqIds.add(doc.data().reqId);
      }
    });

    const snapshot = await db.collection('change_requests')
      .where('uid', '==', safeUid) 
      .where('status', '!=', 'Resolved').get();
      
    let requests = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (activeReqIds.has(data.reqId)) {
        requests.push({
          id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
          title: `"${data.title || 'Untitled Update'}"`,
          type: data.type || "Scope Change",
          date: "Submitted recently",
          status: data.impactStatus || "Analyzing Impact...",
          statusColor: data.riskLevel === 'High' ? 'red' : 'yellow'
        });
      }
    });
    return requests;
  }

  static async getActionItems(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements')
      .where('uid', '==', safeUid) 
      .where('status', 'in', ['Client UAT', 'Pending Approval', 'Clarification Needed', 'Modification Requested', 'Change Requested']).get();
      
    let pendingApprovals = [], clarificationsNeeded = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (data.status === "Client UAT" || data.status === "Pending Approval" || data.status === "Modification Requested" || data.status === "Change Requested") {
        pendingApprovals.push({ id: reqId, title: data.title, meta: "Awaiting your review" });
      } else {
        clarificationsNeeded.push({ id: reqId, title: data.title, meta: "Question from BA", quote: data.clarificationQuestion || "Needs more details." });
      }
    });
    return { pendingApprovals, clarificationsNeeded };
  }

  static async getRecentActivity(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('activity_logs').where('uid', '==', safeUid).get();
    
    let docs = [];
    snapshot.forEach(doc => docs.push(doc));

    docs.sort((a, b) => {
      const timeA = a.data().time?.toMillis ? a.data().time.toMillis() : 0;
      const timeB = b.data().time?.toMillis ? b.data().time.toMillis() : 0;
      return timeB - timeA; 
    });

    if (docs.length > 5) {
      const batch = db.batch();
      for (let i = 5; i < docs.length; i++) {
        batch.delete(docs[i].ref);
      }
      await batch.commit();
    }

    let activities = [];
    const top5Docs = docs.slice(0, 5);
    
    top5Docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: data.reqId || doc.id.substring(0, 6),
        action: data.action,
        time: getTimeAgo(data.time) || "Recently",
        dotColor: data.dotColor || "bg-blue-500",
        rawDate: data.time || 0
      });
    });

    return activities;
  }

  static async searchRequirements(searchQuery, uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
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

  static async getApprovals(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements')
      .where('uid', '==', safeUid) 
      .where('status', 'in', ['Client UAT', 'Modification Requested', 'Change Requested']).get(); 
      
    let approvals = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let formattedDate = "Pending";
      const actualDate = data.verificationSubmittedAt || data.updatedAt || data.submittedAt;
      
      if (actualDate) {
        const dateObj = actualDate.toDate ? actualDate.toDate() : new Date(actualDate);
        formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      approvals.push({
        id: doc.id,
        reqId: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title || 'Untitled Feature',
        submittedBy: data.teamLeaderName || data.developerName || 'Developer Team',
        submittedAt: formattedDate,
        status: data.status,
        evidenceSubmitted: true, 
        baVerified: true, 
        evidence: data.evidence || null, 
        description: data.description || 'No description provided.',
        rejectionReason: data.rejectionReason || null
      });
    });
    return approvals;
  }

  static async approveRequirement(reqId) {
    const snapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (snapshot.empty) throw new Error("Requirement not found");
    
    const batch = db.batch();
    
    batch.update(snapshot.docs[0].ref, {
      status: "Completed",
      rejectionReason: admin.firestore.FieldValue.delete(), 
      isChangeRequest: false,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const tasksQuery = await db.collection('tasks').where('reqId', '==', reqId).get();
    tasksQuery.forEach(tDoc => {
       batch.update(tDoc.ref, { status: "Completed" });
    });

    const crQuery1 = await db.collection('change_requests').where('reqId', '==', reqId).get();
    crQuery1.forEach(crDoc => {
       batch.update(crDoc.ref, { status: "Resolved", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    const crQuery2 = await db.collection('changeRequests').where('reqId', '==', reqId).get();
    crQuery2.forEach(crDoc => {
       batch.update(crDoc.ref, { status: "Resolved", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    await batch.commit();
    return { success: true };
  }

  static async requestChange(reqId, changeType, changeDescription) {
    const snapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (snapshot.empty) throw new Error("Requirement not found");

    const reqDoc = snapshot.docs[0];
    const reqData = reqDoc.data();
    const batch = db.batch();
    
    batch.update(reqDoc.ref, {
      status: "Change Requested", 
      isChangeRequest: true,
      changeRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastChangeType: changeType || "Client Review Feedback",
      rejectionReason: `Client Feedback: ${changeDescription}` 
    });

    const tasksQuery = await db.collection('tasks').where('reqId', '==', reqId).get();
    tasksQuery.forEach(tDoc => {
       if (tDoc.data().status === 'Client UAT') {
           batch.update(tDoc.ref, { status: "In Progress" });
       }
    });

    const generatedCrId = `CR-${Math.floor(1000 + Math.random() * 9000)}`;

    const crRef1 = db.collection('change_requests').doc();
    batch.set(crRef1, {
      id: crRef1.id,
      crId: generatedCrId,
      reqId: reqId,
      title: reqData.title || "Untitled",
      type: changeType || "Scope Change",
      clientDescription: changeDescription,
      description: changeDescription, 
      proposedText: changeDescription,
      status: "Pending", 
      riskLevel: "Pending",
      impactStatus: "Analyzing Impact...",
      uid: reqData.uid,
      clientId: reqData.uid,
      clientName: reqData.clientName || "Client",
      baId: reqData.baId || "", 
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const crRef2 = db.collection('changeRequests').doc();
    batch.set(crRef2, {
      id: crRef2.id,
      crId: generatedCrId, 
      reqId: reqId,
      title: reqData.title || "Untitled",
      type: changeType || "Scope Change",
      clientDescription: changeDescription,
      description: changeDescription,
      proposedText: changeDescription,
      status: "Pending",
      riskLevel: "Pending",
      impactStatus: "Analyzing Impact...",
      uid: reqData.uid,
      clientId: reqData.uid,
      clientName: reqData.clientName || "Client",
      baId: reqData.baId || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true };
  }

  static async getArchivedRequirements(uid) {
    const safeUid = uid || "INVALID";
    const snapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
    
    let archives = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (finishedStatuses.includes(data.status) || data.status === 'Closed — Superseded') {
          let submittedDate = "Unknown";
          let completedDate = "Recently";
          let rawDate = 0;

          if (data.submittedAt) {
            const dateObj = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
            rawDate = dateObj.getTime();
            submittedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
          if (data.approvedAt) {
            const dateObj = data.approvedAt.toDate ? data.approvedAt.toDate() : new Date(data.approvedAt);
            completedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } else if (data.updatedAt) {
            const dateObj = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
            completedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }

          archives.push({
            id: doc.id,
            reqId: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
            title: data.title || 'Untitled Feature',
            submittedAt: submittedDate,
            completedAt: completedDate,
            developer: data.teamLeaderName || data.developerName || 'Development Team',
            status: data.status,
            commitLink: data.evidence?.githubLink || data.commitLink || null,
            rawDate: rawDate
          });
      }
    });

    archives.sort((a, b) => b.rawDate - a.rawDate);
    return archives;
  }
}

class CommunicationModel {
  static async getClarifications(uid) {
    const safeUid = uid || "INVALID";
    const reqsSnapshot = await db.collection('requirements').where('uid', '==', safeUid).get();
    const requirementsMap = {};
    
    reqsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!finishedStatuses.includes(data.status)) {
        requirementsMap[data.reqId] = data;
      }
    });

    const snapshot = await db.collection('clarifications').get();
    let clarifications = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || "Unknown";
      
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
          regarding: parentReq.description || "No context provided.",
          question: data.question || "Details required.",
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

  static async getChatProjects(uid) {
    const reqsSnap = await db.collection('requirements').where('uid', '==', uid || "INVALID").get();
    let projectsMap = {};
    
    const usersSnap = await db.collection('users').get();
    let userMap = {};
    let fallbackBaName = "Business Analyst";
    let fallbackBaImage = null;
    let fallbackBaOnline = false;
    
    usersSnap.forEach(doc => {
        const d = doc.data();
        const actualName = d.fullName || d.name || "Unknown";
        const profileImg = d.profileImage || d.photoURL || d.avatar || d.imageUrl || null;
        userMap[doc.id] = { name: actualName, profileImage: profileImg, isOnline: d.isOnline || false };
        if (d.role === 'BA' || d.role === 'Business Analyst') {
            fallbackBaName = actualName;
            fallbackBaImage = profileImg;
            fallbackBaOnline = d.isOnline || false;
        }
    });

    reqsSnap.forEach(doc => {
        const data = doc.data();
        const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
        
        let finalBaName = fallbackBaName;
        let finalBaImage = fallbackBaImage;
        let finalBaOnline = fallbackBaOnline;

        if (data.baId && userMap[data.baId]) {
            finalBaName = userMap[data.baId].name;
            finalBaImage = userMap[data.baId].profileImage;
            finalBaOnline = userMap[data.baId].isOnline;
        } 
        else if (data.baName && data.baName !== "Unknown BA" && data.baName !== "") {
            finalBaName = data.baName;
            const matchedUser = Object.values(userMap).find(u => u.name === data.baName);
            if (matchedUser) {
                finalBaImage = matchedUser.profileImage;
                finalBaOnline = matchedUser.isOnline;
            }
        }

        projectsMap[reqId] = { 
            id: reqId, title: data.title || "Untitled", baName: finalBaName, baImage: finalBaImage,
            isOnline: finalBaOnline, unreadCount: 0 
        };
    });

    const projectIds = Object.keys(projectsMap);
    if (projectIds.length > 0) {
        const msgsSnap = await db.collection('messages')
            .where('receiverRole', '==', 'Client').where('read', '==', false).get();

        msgsSnap.forEach(doc => {
            const msg = doc.data();
            if (projectsMap[msg.reqId]) { projectsMap[msg.reqId].unreadCount++; }
        });
    }
    return Object.values(projectsMap);
  }

  static async getMessagesForProject(reqId) {
    const msgsSnap = await db.collection('messages').where('reqId', '==', reqId).get();
    const usersSnap = await db.collection('users').get();
    let userMap = {};
    usersSnap.forEach(doc => { userMap[doc.id] = doc.data().fullName || doc.data().name || "Unknown"; });

    let messages = [];
    msgsSnap.forEach(doc => {
        const msg = doc.data();
        const isClientChannel = msg.senderRole === 'Client' || msg.receiverRole === 'Client' || (msg.senderRole === 'BA' && msg.receiverRole === 'Client');
        if (isClientChannel) {
            let realSenderName = msg.senderName;
            if (msg.senderId && userMap[msg.senderId]) realSenderName = userMap[msg.senderId];
            messages.push({
                id: doc.id, ...msg, senderName: realSenderName, 
                timeStr: new Date(msg.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
        }
    });
    messages.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    return messages;
  }

  static async sendMessage(reqId, uid, senderName, text, fileData) {
    let actualName = senderName || "Client";
    if (uid) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) actualName = userDoc.data().fullName || userDoc.data().name || actualName;
    }
    const newMsgRef = db.collection('messages').doc();
    const msgObj = { 
        reqId: reqId, senderId: uid || "UNKNOWN", senderName: actualName, senderRole: "Client", 
        receiverRole: "BA", text: text || "", read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() 
    };
    if (fileData) { msgObj.fileName = fileData.name; msgObj.fileUrl = fileData.base64; }
    await newMsgRef.set(msgObj);
    return { id: newMsgRef.id, ...msgObj, timeStr: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
  }

  static async markMessagesAsRead(reqId, uid) {
    const msgsSnap = await db.collection('messages')
      .where('reqId', '==', reqId).where('receiverRole', '==', 'Client').where('read', '==', false).get();
    if (msgsSnap.empty) return { success: true, count: 0 };
    const batch = db.batch();
    msgsSnap.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
    return { success: true };
  }
}

class UserModel {
  static async getSettings(uid) {
    if (!uid) return null;
    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      const initialData = { fullName: "", email: "", organization: "", role: "Client", profileImage: null, notifications: { email: true, inApp: true, weeklyDigest: false } };
      await docRef.set(initialData); return initialData;
    }
    return doc.data();
  }

  static async updateGeneralSettings(uid, data) {
    if (!uid) throw new Error("UID missing");
    await db.collection('users').doc(uid).update({ fullName: data.fullName, email: data.email, organization: data.organization, profileImage: data.profileImage || null });
  }

  static async updateSecuritySettings(uid, newPassword) {
    if (!uid) throw new Error("UID missing");
    await admin.auth().updateUser(uid, { password: newPassword });
  }

  static async updateNotificationSettings(uid, key, value) {
    if (!uid) throw new Error("UID missing");
    await db.collection('users').doc(uid).update({ [`notifications.${key}`]: value });
  }

  static async getNotifications(uid) {
    if (!uid) return { notifications: [], unreadCount: 0 };
    
    const snapshot = await db.collection('notifications')
      .where('recipientId', '==', uid)
      .get();
      
    let notifications = []; 
    let unreadCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.isRead) unreadCount++;
      
      let timeStr = "Just now";
      let rawTime = 0;
      if (data.createdAt) {
          const dateObj = data.createdAt.toDate();
          rawTime = dateObj.getTime();
          timeStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      notifications.push({ 
          id: doc.id, 
          title: data.title || "Update", 
          message: data.message || "", 
          isRead: data.isRead || false, 
          time: timeStr,
          rawTime: rawTime,
          link: data.link || '#'
      });
    });

    notifications.sort((a, b) => b.rawTime - a.rawTime);
    
    return { notifications: notifications.slice(0, 10), unreadCount };
  }

  static async markNotificationsRead(uid) {
    if (!uid) return;
    const snapshot = await db.collection('notifications')
      .where('recipientId', '==', uid)
      .where('isRead', '==', false)
      .get();
      
    if (snapshot.empty) return;
    
    const batch = db.batch();
    snapshot.forEach(doc => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
  }
}

module.exports = { RequirementModel, CommunicationModel, UserModel };