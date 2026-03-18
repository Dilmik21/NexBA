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
  static async getDashboardData() {
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
        if (['To Do', 'In Progress', 'In Review'].includes(task.status) && task.assigneeName && devLoadMap[task.assigneeName]) {
          devLoadMap[task.assigneeName].count++;
        }
        if (task.reqId) {
          if (!reqTaskStatusMap[task.reqId]) reqTaskStatusMap[task.reqId] = [];
          reqTaskStatusMap[task.reqId].push(task.status || "Unassigned");
        }
      });
    }

    const inProgressStatuses = ["In Analysis", "Clarification Needed", "Tasks Assigned", "In Progress", "Awaiting Verification", "Pending Verification", "Modification Requested"];

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

      if (inProgressStatuses.includes(data.status)) {
        let isFullyFinished = false;
        const reqTasks = reqTaskStatusMap[rawReqId];
        if (reqTasks && reqTasks.length > 0) {
          isFullyFinished = reqTasks.every(status => ['Client Accepted', 'Completed', 'Done'].includes(status));
        }
        if (!isFullyFinished) activeReqs++;
      }
    });

    let developerLoad = Object.values(devLoadMap);
    if (developerLoad.length === 0) developerLoad = [{ name: "Naveen Dilhan", count: 7 }, { name: "Dewni Witharana", count: 5 }, { name: "Sheran Ashintha", count: 4 }];
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

    return { stats: { pendingReviews, verificationQueue: verificationQueueCount, criticalRisks, activeRequirements: activeReqs }, inbox: rawInbox.slice(0, 3), changeRequests: rawChangeRequests.slice(0, 3), developerLoad: developerLoad, verificationQueue: rawVerificationQueue.slice(0, 4), developerUpdates: rawDeveloperUpdates.slice(0, 3) };
  }

  static async getInbox() {
    const reqSnapshot = await db.collection('requirements').get();
    let inbox = [];
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      inbox.push({
        dbId: doc.id, id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, title: data.title || 'Untitled Requirement', description: data.description || data.text || 'No description provided.', submitter: getClientName(data), company: data.company || data.companyName || 'Cargills Corporation', priority: getPriority(data), type: (data.fileUrl || data.fileName || data.attachments || data.type === 'File') ? 'File' : 'Text', fileName: data.fileName || 'document.pdf', fileUrl: data.fileUrl || null, fullDate: formatFullDate(data.submittedAt), timeAgo: getTimeAgo(data.submittedAt), rawDate: data.submittedAt || 0, status: data.status || 'Pending BA Review', isNew: data.status === 'Pending BA Review' 
      });
    });
    inbox.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0);
    });
    return inbox;
  }

  static async search(query) {
    const cleanQuery = query.toLowerCase().replace(/[\s-]/g, '');
    let searchResults = [];
    const reqSnapshot = await db.collection('requirements').get();
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (rawReqId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(query.toLowerCase()))) {
        searchResults.push({ id: rawReqId, title: data.title || 'Untitled', status: data.status || 'Unknown', type: "Requirement" });
      }
    });
    return searchResults;
  }

  static async getHistory() {
    const snapshot = await db.collection('requirements').get();
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
    return { ...reqDoc.data(), ...payload };
  }
}

class BATaskModel {
  static async getHighestTaskId() {
    const lastTaskSnap = await db.collection('tasks').orderBy('taskId', 'desc').limit(1).get();
    if (!lastTaskSnap.empty) {
      const lastIdStr = lastTaskSnap.docs[0].data().taskId || 'TASK-500';
      const lastNum = parseInt(lastIdStr.replace('TASK-', ''));
      if (!isNaN(lastNum)) return lastNum;
    }
    return 500;
  }

  static async getReadyRequirements() {
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

    const globalTaskCount = await this.getHighestTaskId();
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
    return { reqs, globalTaskCount };
  }

  static async getDevelopers() {
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
        { id: "dev2", fullName: "Shenon Lekamge", skills: "Full-stack Developer", currentLoad: 3, maxLoad: 10, initials: "SL" }
      ];
    }
    developers.sort((a, b) => a.currentLoad - b.currentLoad);
    return developers;
  }

  static async clearAndSaveAITasks(reqId, generatedTasks) {
    const existingUnassigned = await db.collection('tasks').where('reqId', '==', reqId).where('status', '==', 'Unassigned').get();
    if (!existingUnassigned.empty) {
      const deleteBatch = db.batch();
      existingUnassigned.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
    }

    let currentMax = await this.getHighestTaskId();
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
    return savedTasks;
  }

  static async assignTasks(reqId, tasks) {
    let currentMax = await this.getHighestTaskId();
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
        
        batch.set(newRef, {
          taskId: `TASK-${formattedNum}`,
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
  }
}

class BACommunicationModel {
  static async sendClarificationQuestions(reqId, questions) {
    const batch = db.batch();
    questions.forEach(q => {
      batch.set(db.collection('clarifications').doc(), { 
        reqId: reqId, 
        question: q, 
        status: "Pending Client", 
        source: "BA", 
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
      });
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
    return clarifications;
  }
}

module.exports = { BARequirementModel, BATaskModel, BACommunicationModel };