const { admin, db } = require('../config/firebase');

// --- NEW: GLOBAL NOTIFICATION SERVICE ---
// This checks user settings BEFORE sending anything!
class NotificationService {
  static async send(targetUid, title, message, type, reqId = null) {
    if (!targetUid || targetUid === "UNKNOWN" || targetUid.includes("MISSING")) return;

    try {
      const userDoc = await db.collection('users').doc(targetUid).get();
      const prefs = userDoc.exists ? userDoc.data().notifications : null;

      // Default to true if preferences haven't been set yet
      const inAppEnabled = prefs?.inApp !== false;
      const emailEnabled = prefs?.email !== false;

      // 1. IN-APP NOTIFICATION
      if (inAppEnabled) {
        await db.collection('notifications').doc().set({
          uid: targetUid,
          reqId: reqId,
          title: title,
          message: message,
          type: type,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      }

      // 2. EMAIL NOTIFICATION
      if (emailEnabled && userDoc.exists && userDoc.data().email) {
        const userEmail = userDoc.data().email;
        console.log(`\n==================================================`);
        console.log(`📧 SYSTEM EMAIL DISPATCHED`);
        console.log(`To: ${userEmail}`);
        console.log(`Subject: ${title}`);
        console.log(`Body: ${message}`);
        console.log(`==================================================\n`);
        // Note: You can plug Nodemailer or SendGrid API right here!
      }
    } catch (error) {
      console.error("NotificationService Error:", error);
    }
  }
}

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

const getClientName = (data) => data.clientName || data.submittedBy || data.userFullName || data.userName || data.fullName || "Unknown Client";
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

class BARequirementModel {
  static async getDashboardData(baId) {
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
      devLoadMap[doc.data().fullName] = { name: doc.data().fullName, count: 0 };
    });

    let reqTaskStatusMap = {}; 
    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        if (['To Do', 'In Progress', 'In Review', 'Pending Team Assignment'].includes(task.status) && task.teamLeaderName && devLoadMap[task.teamLeaderName]) {
          devLoadMap[task.teamLeaderName].count++;
        }
        if (task.reqId) {
          if (!reqTaskStatusMap[task.reqId]) reqTaskStatusMap[task.reqId] = [];
          reqTaskStatusMap[task.reqId].push(task.status || "Unassigned");
        }
      });
    }

    const inProgressStatuses = ["In Analysis", "Clarification Needed", "Sent to Engineering", "In Progress", "Awaiting Verification", "Pending Verification", "Modification Requested"];
    const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      const clientName = getClientName(data);
      
      const dbBaId = data.baId || ""; 
      const isUnassigned = dbBaId === "";
      const isMine = baId && dbBaId === baId; 
      const isFinished = finishedStatuses.includes(data.status);

      if (isUnassigned) {
        pendingReviews++; 
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt), isNew: true });
      } else if (isMine && !isFinished) {
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt), isNew: false });
      }

      if (isMine) {
        if (data.status === "Modification Requested") {
          const changeRisk = getChangeRisk(data);
          if (changeRisk === "High") criticalRisks++;
          rawChangeRequests.push({ id: rawReqId, title: data.lastChangeType ? `${data.lastChangeType} — "${data.title}"` : `Change Request — "${data.title}"`, from: clientName, time: getTimeAgo(data.changeRequestedAt || data.submittedAt), risk: changeRisk, rawDate: data.changeRequestedAt || data.submittedAt || 0 });
        }
        
        if (data.status === "Awaiting Verification" || data.status === "Pending Verification") {
          verificationQueueCount++;
          rawVerificationQueue.push({ id: rawReqId, title: data.title || "Untitled Update", dev: data.developerName || data.assignedTo || "Unknown Developer", date: formatShortDate(data.verificationSubmittedAt || data.submittedAt), rawDate: data.verificationSubmittedAt || data.submittedAt || 0 });
        }

        if (inProgressStatuses.includes(data.status)) {
          let isFullyFinished = false;
          const reqTasks = reqTaskStatusMap[rawReqId];
          if (reqTasks && reqTasks.length > 0) {
            isFullyFinished = reqTasks.every(status => ['Client Accepted', 'Completed', 'Done'].includes(status));
          }
          if (!isFullyFinished) activeReqs++;
        }
      }
    });

    let developerLoad = Object.values(devLoadMap);
    if (developerLoad.length === 0) developerLoad = [{ name: "Naveen Dilhan", count: 12 }, { name: "Dewni Witharana", count: 8 }, { name: "Sheran Ashintha", count: 4 }];
    developerLoad.sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...developerLoad.map(d => d.count), 40);
    developerLoad = developerLoad.map(dev => {
      let color = "bg-[#10B981]", textColor = "text-white";
      if (dev.count >= 35) { color = "bg-gray-100"; textColor = "text-gray-400"; } 
      else if (dev.count >= 25) { color = "bg-yellow-500"; } 
      else if (dev.count >= 15) { color = "bg-[#0A66C2]"; }
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

    return { stats: { pendingReviews, verificationQueue: verificationQueueCount, criticalRisks, activeRequirements: activeReqs }, inbox: rawInbox.slice(0, 3), changeRequests: rawChangeRequests.slice(0, 3), developerLoad: developerLoad, verificationQueue: rawVerificationQueue.slice(0, 4), developerUpdates: rawDeveloperUpdates.slice(0, 3) };
  }

  static async getInbox(baId) {
    const reqSnapshot = await db.collection('requirements').get();
    let inbox = [];
    const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const isUnassigned = !data.baId || data.baId === "";
      const isMine = baId && data.baId === baId;
      const isFinished = finishedStatuses.includes(data.status);
      
      if (isUnassigned || (isMine && !isFinished)) {
        inbox.push({
          dbId: doc.id, id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, title: data.title || 'Untitled Requirement', 
          description: data.description || data.text || 'No description provided.', submitter: getClientName(data), company: data.company || data.companyName || 'Cargills Corporation', priority: getPriority(data), type: (data.fileUrl || data.fileName || data.attachments || data.type === 'File') ? 'File' : 'Text', fileName: data.fileName || 'document.pdf', fileUrl: data.fileUrl || null, fullDate: formatFullDate(data.submittedAt), timeAgo: getTimeAgo(data.submittedAt), rawDate: data.submittedAt || 0, status: data.status || 'Pending BA Review', isNew: isUnassigned
        });
      }
    });

    inbox.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0);
    });
    return inbox;
  }

  static async claimRequirement(reqId, baId, baName) {
    const reqDoc = await this.getRequirementByReqId(reqId);
    if (!reqDoc) throw new Error("Not found");
    await reqDoc.ref.update({ baId: baId, baName: baName, status: "In Analysis" });
  }

  static async search(query, baId) {
    const cleanQuery = query.toLowerCase().replace(/[\s-]/g, '');
    let searchResults = [];
    const reqSnapshot = await db.collection('requirements').get();
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.baId || data.baId === "" || data.baId === baId) {
        const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
        if (rawReqId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(query.toLowerCase()))) {
          searchResults.push({ id: rawReqId, title: data.title || 'Untitled', status: data.status || 'Unknown', type: "Requirement" });
        }
      }
    });
    return searchResults;
  }

  static async getHistory(baId) {
    const snapshot = await db.collection('requirements').where('baId', '==', baId).get();
    let history = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.aiProcessedData) {
        history.push({ id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, title: data.title || 'Untitled', rawDate: data.submittedAt || 0 });
      }
    });
    history.sort((a, b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));
    return history;
  }

  static async getRequirementByReqId(reqId) {
    const snapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (snapshot.empty) return null;
    return { docId: snapshot.docs[0].id, ref: snapshot.docs[0].ref, data: snapshot.docs[0].data() };
  }

  static async updateAIAnalysis(reqId, aiProcessedData, updateStatusToInAnalysis = false) {
    const reqDoc = await this.getRequirementByReqId(reqId);
    if (!reqDoc) throw new Error("Not found");
    const payload = { aiProcessedData: aiProcessedData };
    if (updateStatusToInAnalysis) payload.status = "In Analysis";
    await reqDoc.ref.update(payload);
    return { ...reqDoc.data, ...payload }; 
  }
}

class BATaskModel {
  static async getNextTaskSuffix(reqId) {
    try {
      const snap = await db.collection('tasks').where('reqId', '==', reqId).get();
      let maxSuffix = 0;
      snap.forEach(doc => {
        const taskId = doc.data().taskId || "";
        const parts = taskId.split('-');
        if (parts.length >= 3) {
          const suffix = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
        }
      });
      return maxSuffix + 1;
    } catch (error) { return 1; }
  }

  static async getReadyRequirements(baId) {
    const reqSnapshot = await db.collection('requirements').where('baId', '==', baId).get();
    const tasksSnap = await db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }));
    let taskMap = {};
    if (!tasksSnap.empty) {
      tasksSnap.forEach(doc => {
        const t = doc.data();
        if (!taskMap[t.reqId]) taskMap[t.reqId] = [];
        t.displayId = t.taskId; 
        taskMap[t.reqId].push(t);
      });
    }

    let reqs = [];
    const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      let mappedTasks = taskMap[rawReqId] || [];
      mappedTasks.sort((a, b) => {
        const numA = parseInt(a.taskId.split('-').pop(), 10) || 0;
        const numB = parseInt(b.taskId.split('-').pop(), 10) || 0;
        return numA - numB;
      });

      if (data.aiProcessedData && !finishedStatuses.includes(data.status)) {
        reqs.push({
          id: rawReqId, title: data.title || "Untitled Requirement", status: data.status || "In Analysis",
          projectType: data.projectType || null, teamLeaderName: data.teamLeaderName || null,
          aiProcessedData: data.aiProcessedData, tasks: mappedTasks 
        });
      }
    });
    reqs.sort((a, b) => b.id.localeCompare(a.id));
    return { reqs }; 
  }

  static async getTeamLeaders() {
    const devsSnapshot = await db.collection('users').where('role', '==', 'Developer').get();
    const activeReqsSnap = await db.collection('requirements')
      .where('status', 'in', ['Sent to Engineering', 'In Progress', 'Awaiting Verification', 'Pending Verification', 'Modification Requested'])
      .get().catch(() => ({ empty: true, forEach: () => {} }));
      
    let reqLoadMap = {};
    if (!activeReqsSnap.empty) {
      activeReqsSnap.forEach(doc => {
        const reqData = doc.data();
        if (reqData.teamLeaderId) reqLoadMap[reqData.teamLeaderId] = (reqLoadMap[reqData.teamLeaderId] || 0) + 1;
      });
    }

    const specialtiesList = [ "Web Development", "Mobile Development", "Desktop Development", "Game Development", "Embedded Systems Development", "Cloud Development", "DevOps Development", "AI / Machine Learning Development", "Data Science Development", "Cybersecurity Development" ];
    let leaders = [];
    let i = 0;
    
    devsSnapshot.forEach(doc => {
      const data = doc.data();
      const fullName = data.fullName || data.name || "Unknown Leader";
      const firstName = fullName.split(" ")[0];
      leaders.push({
        id: doc.id, fullName: fullName, teamName: data.teamName || `${firstName}'s Team`,
        specialty: data.specialty || specialtiesList[i % specialtiesList.length],
        initials: fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(),
        currentLoad: reqLoadMap[doc.id] || 0, maxLoad: 10 
      });
      i++;
    });

    if (leaders.length === 0) {
      leaders = [
        { id: "dev1", fullName: "Naveen Dilhan", teamName: "Naveen's Team", specialty: "Web Development", currentLoad: 2, maxLoad: 10, initials: "ND" },
        { id: "dev2", fullName: "Sheran Ashintha", teamName: "Sheran's Team", specialty: "Mobile Development", currentLoad: 5, maxLoad: 10, initials: "SA" }
      ];
    }
    leaders.sort((a, b) => a.currentLoad - b.currentLoad);
    return leaders;
  }

  static async clearAndSaveAITasks(reqId, generatedTasks, projectType) {
    const allTasksSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    const lockedSuffixes = new Set();
    const deleteBatch = db.batch();
    let deletedCount = 0;

    allTasksSnap.forEach(doc => {
      const t = doc.data();
      const suffix = parseInt(t.taskId.split('-').pop(), 10);
      if (t.status === 'Unassigned') {
        deleteBatch.delete(doc.ref); deletedCount++;
      } else {
        if (!isNaN(suffix)) lockedSuffixes.add(suffix);
      }
    });

    if (deletedCount > 0) await deleteBatch.commit();
    const batch = db.batch();
    const savedTasks = [];
    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;
    let currentTry = 1;

    generatedTasks.forEach((task) => {
      while (lockedSuffixes.has(currentTry)) currentTry++;
      const taskId = `TASK-${reqNum}-${currentTry}`;
      lockedSuffixes.add(currentTry); 
      const newRef = db.collection('tasks').doc();
      const taskObj = {
        taskId: taskId, displayId: taskId, reqId: reqId, title: task.title,
        priority: task.priority || 'Medium', requiredRole: task.requiredRole || 'Full-stack Developer',
        status: "Unassigned", createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(newRef, taskObj);
      savedTasks.push(taskObj);
    });

    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) batch.update(reqSnapshot.docs[0].ref, { projectType: projectType || "Web Development" });
    await batch.commit();
    return savedTasks;
  }

  static async saveManualTask(reqId, task) {
    const allTasksSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    const usedSuffixes = new Set();
    allTasksSnap.forEach(doc => {
      const suffix = parseInt(doc.data().taskId.split('-').pop(), 10);
      if (!isNaN(suffix)) usedSuffixes.add(suffix);
    });

    let currentTry = 1;
    while (usedSuffixes.has(currentTry)) currentTry++;

    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;
    const taskId = `TASK-${reqNum}-${currentTry}`;
    const newRef = db.collection('tasks').doc();
    const taskObj = {
      taskId: taskId, displayId: taskId, reqId: reqId, title: task.title,
      priority: task.priority || 'Medium', requiredRole: task.requiredRole || 'Full-stack Developer',
      status: "Unassigned", createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await newRef.set(taskObj);
    return taskObj;
  }

  static async removeTask(taskId) {
    const snapshot = await db.collection('tasks').where('taskId', '==', taskId).get();
    if (snapshot.empty) return null;
    const taskDoc = snapshot.docs[0];
    const reqId = taskDoc.data().reqId;
    await taskDoc.ref.delete();

    const remainingSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    let allRemaining = [];
    remainingSnap.forEach(doc => allRemaining.push({ id: doc.id, ref: doc.ref, data: doc.data() }));

    const lockedTasks = allRemaining.filter(t => t.data.status !== 'Unassigned');
    let unassignedTasks = allRemaining.filter(t => t.data.status === 'Unassigned');
    const lockedSuffixes = new Set();
    lockedTasks.forEach(t => {
      const suffix = parseInt(t.data.taskId.split('-').pop(), 10);
      if (!isNaN(suffix)) lockedSuffixes.add(suffix);
    });

    unassignedTasks.sort((a, b) => (parseInt(a.data.taskId.split('-').pop(), 10) || 0) - (parseInt(b.data.taskId.split('-').pop(), 10) || 0));

    const batch = db.batch();
    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;
    let currentTry = 1;
    
    unassignedTasks.forEach((t) => {
       while (lockedSuffixes.has(currentTry)) currentTry++;
       const newTaskId = `TASK-${reqNum}-${currentTry}`;
       lockedSuffixes.add(currentTry);
       if (t.data.taskId !== newTaskId) {
         batch.update(t.ref, { taskId: newTaskId, displayId: newTaskId });
         t.data.taskId = newTaskId;
         t.data.displayId = newTaskId;
       }
    });
    await batch.commit();
    return allRemaining.map(t => t.data).sort((a, b) => (parseInt(a.taskId.split('-').pop(), 10) || 0) - (parseInt(b.taskId.split('-').pop(), 10) || 0));
  }

  static async sendToEngineeringTeam(reqId, leaderId, leaderName) {
    const batch = db.batch();
    const tasksQuery = await db.collection('tasks').where('reqId', '==', reqId).where('status', '==', 'Unassigned').get();
    tasksQuery.forEach(doc => {
      batch.update(doc.ref, { status: "Pending Team Assignment", teamLeaderId: leaderId, teamLeaderName: leaderName, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    const reqQuery = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqQuery.empty) batch.update(reqQuery.docs[0].ref, { status: "Sent to Engineering", teamLeaderId: leaderId, teamLeaderName: leaderName });
    await batch.commit();
  }
}

class BAChangeModel {
  static async getChangeRequests(baId) {
    const crSnapshot = await db.collection('changeRequests').get();
    let crs = [];
    crSnapshot.forEach(doc => {
      const data = doc.data();
      if (!baId || data.baId === baId || !data.baId) {
        crs.push({ id: doc.id, ...data, aiImpact: data.aiImpact || { riskScore: 0, riskLevel: "Pending Analysis", analysisText: "System generated fallback: Awaiting AI impact assessment. Please review manually.", conflicts: [] } });
      }
    });
    crs.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    });
    return crs;
  }

  static async updateChangeStatus(crId, newStatus) {
    const crRef = db.collection('changeRequests').doc(crId);
    const crSnap = await crRef.get();
    if (!crSnap.exists) throw new Error("Change Request not found");
    const data = crSnap.data();

    const batch = db.batch();
    batch.update(crRef, { status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    if (newStatus === "Approved") {
      const msgRef = db.collection('messages').doc();
      batch.set(msgRef, { reqId: data.reqId, senderRole: "BA", senderName: "System Alert", text: `CHANGE APPROVED: A Scope Change (${data.crId || 'CR'}) has been approved for requirement ${data.reqId}. Proposed change: "${data.proposedText || data.clientDescription}"`, createdAt: admin.firestore.FieldValue.serverTimestamp(), type: "System Alert", teamLeaderId: data.teamLeaderId || null });
      const reqSnap = await db.collection('requirements').where('reqId', '==', data.reqId).get();
      if (!reqSnap.empty) batch.update(reqSnap.docs[0].ref, { status: "Modification Requested", lastChangeType: data.type || "Scope Change", changeRequestedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (newStatus === "Rejected") {
      // --- NEW: Using NotificationService ---
      await NotificationService.send(
        data.clientId || data.submittedBy || "CLIENT_ID_MISSING",
        "Change Request Rejected",
        `Your recent change request for ${data.reqId} was reviewed and rejected by the Business Analyst. Please check the communication hub for details.`,
        "rejection",
        data.reqId
      );
    }
    await batch.commit();
    return { id: crId, ...data, status: newStatus };
  }
}

class BAVerificationModel {
  static async getPendingVerifications(baId) {
    const reqsSnap = await db.collection('requirements').where('baId', '==', baId).get();
    const validReqIds = [];
    const reqMap = {};
    reqsSnap.forEach(doc => {
      validReqIds.push(doc.data().reqId);
      reqMap[doc.data().reqId] = doc.data().description || doc.data().text || "No original specification found.";
    });
    if (validReqIds.length === 0) return [];

    const tasksSnap = await db.collection('tasks').where('status', '==', 'Pending Verification').get();
    let verifications = [];
    tasksSnap.forEach(doc => {
      const task = doc.data();
      if (validReqIds.includes(task.reqId)) {
        verifications.push({ id: doc.id, taskId: task.taskId, reqId: task.reqId, title: task.title, assigneeName: task.assigneeName || task.teamLeaderName || "Developer", submittedAt: task.verificationSubmittedAt || task.updatedAt || task.createdAt, dateStr: formatShortDate(task.verificationSubmittedAt || task.updatedAt), specification: reqMap[task.reqId], evidence: task.evidence || { images: [], video: null, githubLink: null, notes: "" } });
      }
    });
    verifications.sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0));
    return verifications;
  }

  static async approveTask(taskId) {
    const taskQuery = await db.collection('tasks').where('taskId', '==', taskId).get();
    if (taskQuery.empty) throw new Error("Task not found");
    const taskDoc = taskQuery.docs[0];
    const taskData = taskDoc.data();

    const batch = db.batch();
    batch.update(taskDoc.ref, { status: "Client UAT", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    const reqQuery = await db.collection('requirements').where('reqId', '==', taskData.reqId).get();
    if (!reqQuery.empty) {
       const reqData = reqQuery.docs[0].data();
       // --- NEW: Using NotificationService ---
       await NotificationService.send(
         reqData.clientId || reqData.submittedBy || "CLIENT_ID_MISSING",
         "Task Ready for UAT",
         `Task ${taskId} for requirement ${taskData.reqId} has been verified by the BA and is ready for your User Acceptance Testing.`,
         "uat_ready",
         taskData.reqId
       );
    }
    await batch.commit();
    return { success: true };
  }

  static async rejectTask(taskId, reason) {
    const taskQuery = await db.collection('tasks').where('taskId', '==', taskId).get();
    if (taskQuery.empty) throw new Error("Task not found");
    const taskDoc = taskQuery.docs[0];
    const taskData = taskDoc.data();

    const batch = db.batch();
    batch.update(taskDoc.ref, { status: "In Progress", rejectionReason: reason, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();

    // --- NEW: Using NotificationService ---
    await NotificationService.send(
      taskData.assigneeId || taskData.teamLeaderId || "DEV_ID_MISSING",
      "Verification Rejected",
      `Your evidence for ${taskId} was rejected by the BA. Reason: ${reason}`,
      "rejection",
      taskData.reqId
    );
    
    return { success: true };
  }
}

class BACommunicationModel {
  static async sendClarificationQuestions(reqId, questions, baId, baName) {
    const batch = db.batch();
    questions.forEach(q => {
      batch.set(db.collection('clarifications').doc(), { reqId: reqId, question: q, status: "Pending Client", source: "BA", baId: baId, baName: baName, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) batch.update(reqSnapshot.docs[0].ref, { status: "Clarification Needed" });
    await batch.commit();
  }

  static async getClarifications(reqId) {
    const snapshot = await db.collection('clarifications').where('reqId', '==', reqId).get();
    let clarifications = [];
    snapshot.forEach(doc => clarifications.push({ id: doc.id, ...doc.data() }));
    clarifications.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
    return clarifications.map(c => ({ ...c, createdAt: c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : c.createdAt, answeredAt: c.answeredAt?.toDate ? c.answeredAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : c.answeredAt }));
  }

  static async submitAnswer(questionId, answerText) {
    try {
      const docRef = db.collection('clarifications').doc(questionId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const reqId = docSnap.data().reqId;
        await docRef.update({ answer: answerText, status: "Answered", answeredAt: admin.firestore.FieldValue.serverTimestamp() });
        const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
        if (!reqSnapshot.empty) await reqSnapshot.docs[0].ref.update({ status: "In Analysis" });
      }
      return true;
    } catch (error) { throw new Error("Failed to submit answer to database"); }
  }
}

class BACommunicationHubModel {
  static async getChatRequirementsList(baId) {
    const reqsSnap = await db.collection('requirements').get();
    let reqs = [];
    let reqIds = [];
    
    reqsSnap.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      reqIds.push(reqId);
      reqs.push({
        id: reqId, title: data.title || "Untitled Requirement", clientName: getClientName(data), devName: data.teamLeaderName || "Unassigned Team",
        unreadClient: 0, unreadDev: 0, lastActivity: data.updatedAt || data.submittedAt || { toMillis: () => 0 }
      });
    });

    if (reqIds.length === 0) return [];

    const msgsSnap = await db.collection('messages').where('read', '==', false).get();
    msgsSnap.forEach(doc => {
      const msg = doc.data();
      if (reqIds.includes(msg.reqId)) {
        const targetReq = reqs.find(r => r.id === msg.reqId);
        if (targetReq) {
          if (msg.senderRole === 'Client' || msg.senderId === targetReq.clientId) targetReq.unreadClient++;
          else if (msg.senderRole === 'Developer' || msg.senderRole === 'Dev') targetReq.unreadDev++;
          
          if (msg.createdAt && (!targetReq.lastActivity || (msg.createdAt.toMillis && msg.createdAt.toMillis() > (targetReq.lastActivity.toMillis ? targetReq.lastActivity.toMillis() : 0)))) {
            targetReq.lastActivity = msg.createdAt;
          }
        }
      }
    });

    reqs.sort((a, b) => {
      const timeA = a.lastActivity?.toMillis?.() || 0;
      const timeB = b.lastActivity?.toMillis?.() || 0;
      return timeB - timeA;
    });
    return reqs;
  }

  static async getMessagesForRequirement(reqId, channel) {
    const msgsSnap = await db.collection('messages').where('reqId', '==', reqId).get();
    const usersSnap = await db.collection('users').get();
    let userMap = {};
    usersSnap.forEach(doc => { userMap[doc.id] = doc.data().fullName || doc.data().name || "Unknown"; });

    let messages = [];
    msgsSnap.forEach(doc => {
      const msg = doc.data();
      const isClientMsg = msg.senderRole === 'Client' || msg.receiverRole === 'Client' || (msg.senderRole === 'BA' && msg.receiverRole === 'Client');
      const isDevMsg = msg.senderRole === 'Developer' || msg.senderRole === 'Dev' || msg.receiverRole === 'Developer' || (msg.senderRole === 'BA' && msg.receiverRole === 'Developer') || msg.type === 'System Alert';

      if ((channel === 'Client' && isClientMsg) || (channel === 'Developer' && isDevMsg)) {
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

  static async sendMessage(reqId, senderId, senderName, channel, text, fileData) {
    let actualName = senderName || "Business Analyst";
    if (senderId) {
      const userDoc = await db.collection('users').doc(senderId).get();
      if (userDoc.exists) {
         const d = userDoc.data();
         actualName = d.fullName || d.name || actualName;
      }
    }

    const newMsgRef = db.collection('messages').doc();
    const msgObj = {
      reqId, senderId, senderName: actualName, senderRole: "BA", receiverRole: channel, text: text || "", read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (fileData) { msgObj.fileName = fileData.name; msgObj.fileUrl = fileData.base64; }
    await newMsgRef.set(msgObj);

    let targetUid = "UNKNOWN";
    const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnap.empty) {
      const reqData = reqSnap.docs[0].data();
      if (channel === 'Client') targetUid = reqData.clientId || reqData.submittedBy;
      if (channel === 'Developer') targetUid = reqData.teamLeaderId || "DEV_TEAM";
    }

    // --- NEW: Using NotificationService ---
    await NotificationService.send(
      targetUid,
      "New Message from BA",
      `You have a new message regarding ${reqId}.`,
      "message",
      reqId
    );

    return { id: newMsgRef.id, ...msgObj, timeStr: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
  }

  static async markMessagesAsRead(reqId, channel) {
    const msgsSnap = await db.collection('messages').where('reqId', '==', reqId).where('senderRole', '==', channel).where('read', '==', false).get();
    if (msgsSnap.empty) return { success: true, count: 0 };
    const batch = db.batch();
    let count = 0;
    msgsSnap.forEach(doc => { batch.update(doc.ref, { read: true }); count++; });
    await batch.commit();
    return { success: true, count };
  }
}

class BAProgressModel {
  static async getProgressData(baId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fbSevenDaysAgo = admin.firestore.Timestamp.fromDate(sevenDaysAgo);

    const reqSnap = await db.collection('requirements').where('baId', '==', baId).get();
    let reqsProcessedWeek = 0;
    let timeline = [];
    const reqIds = [];

    reqSnap.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0,4).toUpperCase()}`;
      reqIds.push(reqId);

      if (data.updatedAt && data.updatedAt > fbSevenDaysAgo) reqsProcessedWeek++;
      else if (data.submittedAt && data.submittedAt > fbSevenDaysAgo && data.status !== 'Pending BA Review') reqsProcessedWeek++;

      let stage = "Analysis";
      let progress = 20;
      let colorClass = "bg-yellow-400"; 
      let badgeClass = "bg-yellow-100 text-yellow-800";

      if (['Sent to Engineering', 'In Progress', 'Pending Verification', 'Modification Requested'].includes(data.status)) {
        stage = "Development"; progress = 60; colorClass = "bg-[#007BFF]"; badgeClass = "bg-blue-100 text-blue-800";
      } else if (['Client UAT', 'Awaiting Verification'].includes(data.status)) {
        stage = "UAT"; progress = 90; colorClass = "bg-purple-500"; badgeClass = "bg-purple-100 text-purple-800";
      } else if (['Approved & Live', 'Completed', 'Done', 'Live', 'Closed'].includes(data.status)) {
        stage = "Completed"; progress = 100; colorClass = "bg-green-500"; badgeClass = "bg-green-100 text-green-800";
      }

      timeline.push({
        reqId: reqId,
        title: data.title || "Untitled Project",
        stage, progress, colorClass, badgeClass,
        rawDate: data.submittedAt || 0
      });
    });

    if (reqIds.length === 0) return { stats: { reqs: 0, tasks: 0, verifications: 0, changes: 0 }, timeline: [] };

    const tasksSnap = await db.collection('tasks').get();
    let tasksAssignedWeek = 0;
    let verificationsWeek = 0;
    let taskStatsByReq = {}; 

    tasksSnap.forEach(doc => {
      const data = doc.data();
      if (reqIds.includes(data.reqId)) {
        if (data.createdAt && data.createdAt >= fbSevenDaysAgo) tasksAssignedWeek++;
        if (data.updatedAt && data.updatedAt >= fbSevenDaysAgo && ['Client UAT', 'Completed', 'Done'].includes(data.status)) verificationsWeek++;

        if(!taskStatsByReq[data.reqId]) taskStatsByReq[data.reqId] = { total: 0, completed: 0 };
        taskStatsByReq[data.reqId].total++;
        if(['Client UAT', 'Completed', 'Done'].includes(data.status)) taskStatsByReq[data.reqId].completed++;
      }
    });

    timeline = timeline.map(item => {
       if(taskStatsByReq[item.reqId] && taskStatsByReq[item.reqId].total > 0) {
          const stats = taskStatsByReq[item.reqId];
          const calcProg = Math.round((stats.completed / stats.total) * 100);
          if (item.stage === 'Development') item.progress = Math.max(20, calcProg);
          else if (item.stage === 'UAT') item.progress = Math.max(90, calcProg);
       }
       return item;
    });

    const crSnap = await db.collection('changeRequests').get();
    let changesWeek = 0;
    crSnap.forEach(doc => {
      const data = doc.data();
      if ((data.baId === baId || reqIds.includes(data.reqId)) && ['Approved', 'Rejected'].includes(data.status)) {
         if (data.updatedAt && data.updatedAt >= fbSevenDaysAgo) changesWeek++;
      }
    });

    timeline.sort((a,b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));

    return {
      stats: { reqs: reqsProcessedWeek, tasks: tasksAssignedWeek, verifications: verificationsWeek, changes: changesWeek },
      timeline
    };
  }
}

class BAUserModel {
  static async getSettings(uid) {
    if (!uid) return null;
    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      const initialData = {
        fullName: "", email: "", organization: "", role: "BA", profileImage: null,
        notifications: { email: true, inApp: true, weeklyDigest: false }
      };
      await docRef.set(initialData);
      return initialData;
    }
    return doc.data();
  }

  static async updateGeneralSettings(uid, data) {
    if (!uid) throw new Error("UID missing");
    await db.collection('users').doc(uid).update({
      fullName: data.fullName, 
      email: data.email, 
      organization: data.organization, 
      profileImage: data.profileImage || null
    });
  }

  static async updateSecuritySettings(uid, newPassword) {
    if (!uid) throw new Error("UID missing");
    await admin.auth().updateUser(uid, { password: newPassword });
  }

  static async updateNotificationSettings(uid, key, value) {
    if (!uid) throw new Error("UID missing");
    await db.collection('users').doc(uid).update({
      [`notifications.${key}`]: value
    });
  }
}

module.exports = { BARequirementModel, BATaskModel, BAChangeModel, BAVerificationModel, BACommunicationModel, BACommunicationHubModel, BAProgressModel, BAUserModel };