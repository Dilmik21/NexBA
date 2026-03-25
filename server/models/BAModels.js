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
          status: data.status || 'Pending BA Review', 
          isNew: isUnassigned
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
    
    await reqDoc.ref.update({
      baId: baId,
      baName: baName,
      status: "In Analysis" 
    });
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
          if (!isNaN(suffix) && suffix > maxSuffix) {
            maxSuffix = suffix;
          }
        }
      });
      return maxSuffix + 1;
    } catch (error) {
      console.error("Error fetching next task suffix:", error);
      return 1;
    }
  }

  static async getReadyRequirements(baId) {
    const reqSnapshot = await db.collection('requirements')
      .where('baId', '==', baId)
      .get();
      
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
          id: rawReqId,
          title: data.title || "Untitled Requirement",
          status: data.status || "In Analysis",
          projectType: data.projectType || null, 
          teamLeaderName: data.teamLeaderName || null,
          aiProcessedData: data.aiProcessedData,
          tasks: mappedTasks 
        });
      }
    });

    reqs.sort((a, b) => b.id.localeCompare(a.id));
    return { reqs }; 
  }

  static async getTeamLeaders() {
    const devsSnapshot = await db.collection('users').where('role', '==', 'Developer').get();
    
    // Count REQUIREMENTS assigned to each leader
    const activeReqsSnap = await db.collection('requirements')
      .where('status', 'in', ['Sent to Engineering', 'In Progress', 'Awaiting Verification', 'Pending Verification', 'Modification Requested'])
      .get()
      .catch(() => ({ empty: true, forEach: () => {} }));
      
    let reqLoadMap = {};
    if (!activeReqsSnap.empty) {
      activeReqsSnap.forEach(doc => {
        const reqData = doc.data();
        if (reqData.teamLeaderId) {
          reqLoadMap[reqData.teamLeaderId] = (reqLoadMap[reqData.teamLeaderId] || 0) + 1;
        }
      });
    }

    const specialtiesList = [
      "Web Development", "Mobile Development", "Desktop Development", 
      "Game Development", "Embedded Systems Development", "Cloud Development", 
      "DevOps Development", "AI / Machine Learning Development", 
      "Data Science Development", "Cybersecurity Development"
    ];

    let leaders = [];
    let i = 0;
    
    devsSnapshot.forEach(doc => {
      const data = doc.data();
      const fullName = data.fullName || data.name || "Unknown Leader";
      const firstName = fullName.split(" ")[0];
      
      leaders.push({
        id: doc.id,
        fullName: fullName,
        teamName: data.teamName || `${firstName}'s Team`,
        specialty: data.specialty || specialtiesList[i % specialtiesList.length],
        initials: fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(),
        currentLoad: reqLoadMap[doc.id] || 0,
        maxLoad: 10 
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

  // --- BULLETPROOF ID RECYCLING: Guaranteed to reuse 1, 2, 3 for new AI tasks ---
  static async clearAndSaveAITasks(reqId, generatedTasks, projectType) {
    const allTasksSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    
    const lockedSuffixes = new Set();
    const deleteBatch = db.batch();

    let deletedCount = 0;

    allTasksSnap.forEach(doc => {
      const t = doc.data();
      const suffix = parseInt(t.taskId.split('-').pop(), 10);

      // We ONLY delete Unassigned tasks. 
      if (t.status === 'Unassigned') {
        deleteBatch.delete(doc.ref);
        deletedCount++;
      } else {
        // If a task is assigned/locked, its number is strictly taken
        if (!isNaN(suffix)) lockedSuffixes.add(suffix);
      }
    });

    if (deletedCount > 0) {
      await deleteBatch.commit();
    }

    const batch = db.batch();
    const savedTasks = [];
    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;
    
    let currentTry = 1;

    generatedTasks.forEach((task) => {
      // Loop upwards from 1 until we find an ID that is NOT in lockedSuffixes
      // This means if 1, 2, and 3 were just deleted, they are instantly reused here!
      while (lockedSuffixes.has(currentTry)) {
        currentTry++;
      }
      
      const taskId = `TASK-${reqNum}-${currentTry}`;
      lockedSuffixes.add(currentTry); // Mark it as taken for the next loop
      
      const newRef = db.collection('tasks').doc();
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

    const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqSnapshot.empty) {
        batch.update(reqSnapshot.docs[0].ref, { projectType: projectType || "Web Development" });
    }

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
    while (usedSuffixes.has(currentTry)) {
      currentTry++;
    }

    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;
    const taskId = `TASK-${reqNum}-${currentTry}`;
    
    const newRef = db.collection('tasks').doc();
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

    unassignedTasks.sort((a, b) => {
       const numA = parseInt(a.data.taskId.split('-').pop(), 10) || 0;
       const numB = parseInt(b.data.taskId.split('-').pop(), 10) || 0;
       return numA - numB;
    });

    const batch = db.batch();
    const reqNum = reqId.includes('-') ? reqId.split('-')[1] : reqId;

    let currentTry = 1;
    unassignedTasks.forEach((t) => {
       while (lockedSuffixes.has(currentTry)) {
         currentTry++;
       }
       const newTaskId = `TASK-${reqNum}-${currentTry}`;
       lockedSuffixes.add(currentTry);

       if (t.data.taskId !== newTaskId) {
         batch.update(t.ref, { taskId: newTaskId, displayId: newTaskId });
         t.data.taskId = newTaskId;
         t.data.displayId = newTaskId;
       }
    });

    await batch.commit();

    const finalArray = allRemaining.map(t => t.data).sort((a, b) => {
       const numA = parseInt(a.taskId.split('-').pop(), 10) || 0;
       const numB = parseInt(b.taskId.split('-').pop(), 10) || 0;
       return numA - numB;
    });

    return finalArray;
  }

  static async sendToEngineeringTeam(reqId, leaderId, leaderName) {
    const batch = db.batch();
    
    const tasksQuery = await db.collection('tasks')
      .where('reqId', '==', reqId)
      .where('status', '==', 'Unassigned')
      .get();

    tasksQuery.forEach(doc => {
      batch.update(doc.ref, {
        status: "Pending Team Assignment", 
        teamLeaderId: leaderId,
        teamLeaderName: leaderName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    const reqQuery = await db.collection('requirements').where('reqId', '==', reqId).get();
    if (!reqQuery.empty) {
      batch.update(reqQuery.docs[0].ref, {
        status: "Sent to Engineering",
        teamLeaderId: leaderId,
        teamLeaderName: leaderName
      });
    }

    await batch.commit();
  }
}

class BACommunicationModel {
  static async sendClarificationQuestions(reqId, questions, baId, baName) {
    const batch = db.batch();
    questions.forEach(q => {
      batch.set(db.collection('clarifications').doc(), { 
        reqId: reqId, 
        question: q, 
        status: "Pending Client", 
        source: "BA",
        baId: baId,      
        baName: baName,  
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
    
    return clarifications.map(c => ({
      ...c,
      createdAt: c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : c.createdAt,
      answeredAt: c.answeredAt?.toDate ? c.answeredAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : c.answeredAt
    }));
  }

  static async submitAnswer(questionId, answerText) {
    try {
      const docRef = db.collection('clarifications').doc(questionId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const reqId = docSnap.data().reqId;

        await docRef.update({
          answer: answerText,
          status: "Answered",
          answeredAt: admin.firestore.FieldValue.serverTimestamp() 
        });

        const reqSnapshot = await db.collection('requirements').where('reqId', '==', reqId).get();
        if (!reqSnapshot.empty) {
           await reqSnapshot.docs[0].ref.update({ status: "In Analysis" });
        }
      }
      return true;
    } catch (error) {
      console.error("Error updating answer in Firestore:", error);
      throw new Error("Failed to submit answer to database");
    }
  }
}

module.exports = { BARequirementModel, BATaskModel, BACommunicationModel };