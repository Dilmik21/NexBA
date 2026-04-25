const { admin, db } = require('../config/firebase');

const getTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60; if (interval > 1) return Math.floor(interval) + " min ago";
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
      db.collection('users').get(), 
      db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} })), 
      db.collection('messages').where('senderRole', '==', 'Developer').get().catch(() => ({ empty: true, forEach: () => {} })) 
    ]);
    
    let pendingReviews = 0, verificationQueueCount = 0, criticalRisks = 0, activeReqs = 0;
    let rawInbox = [], rawChangeRequests = [], rawVerificationQueue = []; 
    
    const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];
    const preDevStatuses = ['Pending BA Review', 'In Analysis', 'Clarification Needed'];

    const activeReqIdsPerDevId = {};
    const activeReqIdsPerDevName = {};

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      const clientName = getClientName(data);
      const dbBaId = data.baId || ""; 
      const isUnassigned = dbBaId === "";
      const isMine = baId && dbBaId === baId; 
      
      const status = data.status || "Pending BA Review";
      const isFinished = finishedStatuses.includes(status);
      const isPreDev = preDevStatuses.includes(status);

      if (!isFinished && !isPreDev) {
        if (data.teamLeaderId) {
            if (!activeReqIdsPerDevId[data.teamLeaderId]) activeReqIdsPerDevId[data.teamLeaderId] = new Set();
            activeReqIdsPerDevId[data.teamLeaderId].add(rawReqId);
        }
        if (data.teamLeaderName) {
            if (!activeReqIdsPerDevName[data.teamLeaderName]) activeReqIdsPerDevName[data.teamLeaderName] = new Set();
            activeReqIdsPerDevName[data.teamLeaderName].add(rawReqId);
        }
      }

      if (isUnassigned) {
        pendingReviews++; 
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt), isNew: true });
      } else if (isMine && !isFinished) {
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt), isNew: false });
      }

      if (isMine) {
        if (status === "Modification Requested" || status === "Change Requested") {
          const changeRisk = getChangeRisk(data);
          if (changeRisk === "High") criticalRisks++;
          rawChangeRequests.push({ id: rawReqId, title: data.lastChangeType ? `${data.lastChangeType} — "${data.title}"` : `Change Request — "${data.title}"`, from: clientName, time: getTimeAgo(data.changeRequestedAt || data.submittedAt), risk: changeRisk, rawDate: data.changeRequestedAt || data.submittedAt || 0 });
        }
        
        if (status === "Awaiting Verification" || status === "Pending Verification") {
          verificationQueueCount++;
          rawVerificationQueue.push({ id: rawReqId, title: data.title || "Untitled Update", dev: data.teamLeaderName || data.developerName || "Unknown Developer", date: formatShortDate(data.verificationSubmittedAt || data.updatedAt), rawDate: data.verificationSubmittedAt || data.updatedAt || 0 });
        }

        if (!isFinished && !isPreDev) {
          activeReqs++;
        }
      }
    });

    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const taskData = doc.data();
        if (taskData.status !== 'Unassigned' && !finishedStatuses.includes(taskData.status)) {
          if (taskData.teamLeaderId) {
              if (!activeReqIdsPerDevId[taskData.teamLeaderId]) activeReqIdsPerDevId[taskData.teamLeaderId] = new Set();
              activeReqIdsPerDevId[taskData.teamLeaderId].add(taskData.reqId);
          }
          if (taskData.teamLeaderName) {
              if (!activeReqIdsPerDevName[taskData.teamLeaderName]) activeReqIdsPerDevName[taskData.teamLeaderName] = new Set();
              activeReqIdsPerDevName[taskData.teamLeaderName].add(taskData.reqId);
          }
        }
      });
    }

    let developerLoad = [];
    devsSnapshot.forEach(doc => { 
        const data = doc.data();
        const role = (data.role || "").toLowerCase();
        if(role === 'developer' || role === 'dev' || role === 'engineering') {
            const fullName = data.fullName || data.name || "Unknown Leader";
            const loadById = activeReqIdsPerDevId[doc.id] ? activeReqIdsPerDevId[doc.id].size : 0;
            const loadByName = activeReqIdsPerDevName[fullName] ? activeReqIdsPerDevName[fullName].size : 0;
            const trueLoad = Math.max(loadById, loadByName);

            let color = "bg-[#10B981]", textColor = "text-white";
            if (trueLoad >= 8) color = "bg-red-500"; 
            else if (trueLoad >= 4) color = "bg-yellow-500"; 
            
            const widthPercent = Math.max(Math.min((trueLoad / 10) * 100, 100), 5);
            
            developerLoad.push({ name: fullName, count: trueLoad, color, textColor, widthPercent });
        }
    });

    if (developerLoad.length === 0) developerLoad = [{ name: "No Developers Active", count: 0, color: "bg-gray-200", textColor: "text-gray-500", widthPercent: 5 }];
    developerLoad.sort((a, b) => b.count - a.count);

    let rawDeveloperUpdates = [];
    if (!messagesSnapshot.empty) {
      messagesSnapshot.forEach(doc => {
        const msg = doc.data();
        rawDeveloperUpdates.push({ initials: msg.senderName ? msg.senderName.substring(0, 2).toUpperCase() : "DV", color: "bg-green-500", name: msg.senderName || "Unknown", task: msg.taskId || "General", message: msg.text || "", rawDate: msg.createdAt || 0, time: getTimeAgo(msg.createdAt) });
      });
    }

    rawInbox.sort((a, b) => (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0));
    rawChangeRequests.sort((a, b) => (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0));
    rawVerificationQueue.sort((a, b) => (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0));
    rawDeveloperUpdates.sort((a, b) => (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0));

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
          fileName: data.fileName || null, 
          fileUrl: data.fileUrl || null, 
          fileData: data.fileData || data.fileUrl || null,
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
      return (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0);
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
        history.push({ 
            id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, 
            title: data.title || 'Untitled', 
            status: data.status || 'Unknown', 
            rawDate: data.submittedAt || 0 
        });
      }
    });
    history.sort((a, b) => (b.rawDate?.toMillis?.() || 0) - (a.rawDate?.toMillis?.() || 0));
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
    
    const clarificationsSnap = await db.collection('clarifications').get().catch(() => ({ empty: true, forEach: () => {} }));
    const pendingClarifications = new Set();
    if (!clarificationsSnap.empty) {
        clarificationsSnap.forEach(doc => {
            if (doc.data().status === 'Pending Client') {
                pendingClarifications.add(doc.data().reqId);
            }
        });
    }

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

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      let status = data.status || "";

      if (status === 'Clarification Needed' && !pendingClarifications.has(rawReqId)) {
          status = 'In Analysis'; 
          doc.ref.update({ 
              status: 'In Analysis',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }).catch(() => console.log("Background DB heal failed, but UI is fixed."));
      }

      if (status === 'Clarification Needed' || status === 'Pending BA Review') return;

      let mappedTasks = taskMap[rawReqId] || [];
      mappedTasks.sort((a, b) => {
        const numA = parseInt(a.taskId.split('-').pop(), 10) || 0;
        const numB = parseInt(b.taskId.split('-').pop(), 10) || 0;
        return numA - numB;
      });

      if (data.aiProcessedData) {
        reqs.push({
          id: rawReqId, title: data.title || "Untitled Requirement", status: status,
          projectType: data.projectType || null, teamLeaderName: data.teamLeaderName || null,
          aiProcessedData: data.aiProcessedData, tasks: mappedTasks 
        });
      }
    });
    reqs.sort((a, b) => b.id.localeCompare(a.id));
    return { reqs }; 
  }

  static async getTeamLeaders() {
    const [usersSnapshot, reqsSnapshot, tasksSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('requirements').get(),
        db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }))
    ]);
      
    let activeReqIdsPerDevId = {};
    let activeReqIdsPerDevName = {};

    const inactiveStatuses = [
        'Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done',
        'Pending BA Review', 'In Analysis', 'Clarification Needed'
    ];

    reqsSnapshot.forEach(doc => {
      const reqData = doc.data();
      const status = reqData.status || "";
      
      if (!inactiveStatuses.includes(status)) {
        if (reqData.teamLeaderId) {
            if (!activeReqIdsPerDevId[reqData.teamLeaderId]) activeReqIdsPerDevId[reqData.teamLeaderId] = new Set();
            activeReqIdsPerDevId[reqData.teamLeaderId].add(reqData.reqId || doc.id);
        }
        if (reqData.teamLeaderName) {
            if (!activeReqIdsPerDevName[reqData.teamLeaderName]) activeReqIdsPerDevName[reqData.teamLeaderName] = new Set();
            activeReqIdsPerDevName[reqData.teamLeaderName].add(reqData.reqId || doc.id);
        }
      }
    });

    if (!tasksSnapshot.empty) {
        tasksSnapshot.forEach(doc => {
           const taskData = doc.data();
           if (taskData.status !== 'Unassigned' && !inactiveStatuses.includes(taskData.status)) {
              if (taskData.teamLeaderId) {
                  if (!activeReqIdsPerDevId[taskData.teamLeaderId]) activeReqIdsPerDevId[taskData.teamLeaderId] = new Set();
                  activeReqIdsPerDevId[taskData.teamLeaderId].add(taskData.reqId);
              }
              if (taskData.teamLeaderName) {
                  if (!activeReqIdsPerDevName[taskData.teamLeaderName]) activeReqIdsPerDevName[taskData.teamLeaderName] = new Set();
                  activeReqIdsPerDevName[taskData.teamLeaderName].add(taskData.reqId);
              }
           }
        });
    }

    const specialtiesList = [ "Web Development", "Mobile Development", "Desktop Development", "Game Development", "Embedded Systems Development", "Cloud Development", "DevOps Development", "AI / Machine Learning Development", "Data Science Development", "Cybersecurity Development" ];
    let leaders = [];
    let i = 0;
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const role = (data.role || "").toLowerCase();
      
      if (role === 'developer' || role === 'dev' || role === 'engineering') {
          const fullName = data.fullName || data.name || "Unknown Leader";
          const firstName = fullName.split(" ")[0];
          
          const loadById = activeReqIdsPerDevId[doc.id] ? activeReqIdsPerDevId[doc.id].size : 0;
          const loadByName = activeReqIdsPerDevName[fullName] ? activeReqIdsPerDevName[fullName].size : 0;
          const trueLoad = Math.max(loadById, loadByName);

          leaders.push({
            id: doc.id, 
            fullName: fullName, 
            teamName: data.teamName || `${firstName}'s Team`,
            specialty: data.specialty || specialtiesList[i % specialtiesList.length],
            initials: fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(),
            currentLoad: trueLoad, 
            maxLoad: 10 
          });
          i++;
      }
    });

    if (leaders.length === 0) {
      leaders = [
        { id: "dev1", fullName: "Ghost System Developer", teamName: "Fallback Team", specialty: "Web Development", currentLoad: 0, maxLoad: 10, initials: "GH" }
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
    if (!reqQuery.empty) {
        batch.update(reqQuery.docs[0].ref, { status: "Sent to Engineering", teamLeaderId: leaderId, teamLeaderName: leaderName });
    } else {
        const allReqs = await db.collection('requirements').get();
        allReqs.forEach(doc => {
            const rId = doc.data().reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
            if (rId === reqId) {
                batch.update(doc.ref, { status: "Sent to Engineering", teamLeaderId: leaderId, teamLeaderName: leaderName });
            }
        });
    }
    await batch.commit();
  }
}

class BAChangeModel {
  static async getChangeRequests(baId) {
    let crs = [];
    const reqsSnap = await db.collection('requirements').get();
    const reqMap = {};
    reqsSnap.forEach(doc => {
        reqMap[doc.data().reqId] = doc.data();
    });

    const processCR = (doc, data) => {
      const parentReq = reqMap[data.reqId];

      if (parentReq && (parentReq.status === 'Completed' || parentReq.status === 'Approved & Live' || parentReq.status === 'Done')) {
         return null;
      }
      if (data.status === 'Resolved') return null;

      const finalClientName = data.clientName || (parentReq ? (parentReq.clientName || parentReq.submittedBy || "Client") : "Client");

      let displayStatus = data.status;
      if (parentReq) {
          if (parentReq.status === 'Pending Verification' || parentReq.status === 'Client UAT') {
              displayStatus = 'Pending Verification'; 
          } else if (parentReq.status === 'In Progress' && parentReq.rejectionReason) {
              displayStatus = 'In Development'; 
          }
      }

      if (!baId || data.baId === baId || !data.baId || data.baId === "UNASSIGNED") {
        return {
          id: doc.id,
          ...data,
          status: displayStatus, 
          clientName: finalClientName,
          aiImpact: data.aiImpact || { riskScore: 0, riskLevel: "Pending Analysis", analysisText: "Awaiting AI impact assessment.", conflicts: [] }
        };
      }
      return null;
    }

    const crSnapshot1 = await db.collection('change_requests').get();
    crSnapshot1.forEach(doc => {
      const res = processCR(doc, doc.data());
      if (res) crs.push(res);
    });

    const crSnapshot2 = await db.collection('changeRequests').get();
    crSnapshot2.forEach(doc => {
      const data = doc.data();
      if (!crs.find(c => c.crId === data.crId)) {
        const res = processCR(doc, data);
        if (res) crs.push(res);
      }
    });

    crs = crs.map(cr => {
        let submittedDate = "Recently";
        if (cr.createdAt) {
          const dateObj = cr.createdAt.toDate ? cr.createdAt.toDate() : new Date(cr.createdAt);
          submittedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return { ...cr, date: submittedDate };
    });

    crs.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    });
    return crs;
  }

  static async updateChangeStatus(crId, newStatus) {
    let crRef = db.collection('change_requests').doc(crId);
    let crSnap = await crRef.get();
    
    if (!crSnap.exists) {
       crRef = db.collection('changeRequests').doc(crId);
       crSnap = await crRef.get();
    }
    
    if (!crSnap.exists) throw new Error("Change Request not found in database.");
    
    const data = crSnap.data();
    const batch = db.batch();

    if (newStatus === "Approved") {
      batch.update(crRef, { status: "In Development", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

      const reqSnap = await db.collection('requirements').where('reqId', '==', data.reqId).get();
      if (!reqSnap.empty) {
        batch.update(reqSnap.docs[0].ref, { status: "In Progress", isChangeRequest: true });
      }
      
      const taskSnap = await db.collection('tasks').where('reqId', '==', data.reqId).get();
      taskSnap.forEach(tDoc => {
         batch.update(tDoc.ref, { status: "In Progress" });
      });

      const msgRef = db.collection('messages').doc();
      batch.set(msgRef, { reqId: data.reqId, senderRole: "BA", senderName: "System Alert", text: `CHANGE APPROVED: A Scope Change (${data.crId || 'CR'}) has been approved and moved to In Progress. Client requested: "${data.proposedText || data.clientDescription || data.description}"`, createdAt: admin.firestore.FieldValue.serverTimestamp(), type: "System Alert", teamLeaderId: data.teamLeaderId || null });

      await batch.commit();
      return { id: crId, ...data, status: "In Development" };

    } else if (newStatus === "Rejected") {
      batch.update(crRef, { status: "Rejected by BA", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

      const reqSnap = await db.collection('requirements').where('reqId', '==', data.reqId).get();
      if (!reqSnap.empty) {
        batch.update(reqSnap.docs[0].ref, { 
            status: "Client UAT", 
            isChangeRequest: false, 
            rejectionReason: "Change Request was declined after discussion. You may now approve the originally submitted evidence." 
        });
      }

      await batch.commit();
      return { id: crId, ...data, status: "Rejected by BA" };
    }
  }
}

class BAVerificationModel {
  static async getPendingVerifications(baId) {
    const reqsSnap = await db.collection('requirements')
       .where('status', 'in', ['Pending Verification', 'Client UAT'])
       .get();

    let verifications = [];
    reqsSnap.forEach(doc => {
      const req = doc.data();
      if (req.baId === baId || !req.baId) {
        verifications.push({
          id: doc.id,
          taskId: req.reqId, 
          reqId: req.reqId,
          title: req.title,
          status: req.status,
          assigneeName: req.teamLeaderName || req.developerName || "Developer Team",
          submittedAt: req.verificationSubmittedAt || req.updatedAt || req.createdAt,
          dateStr: formatShortDate(req.verificationSubmittedAt || req.updatedAt),
          specification: req.description || "No description found.",
          evidence: req.evidence || { files: [], githubLink: "", notes: "No notes provided." }
        });
      }
    });

    verifications.sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0));
    return verifications;
  }

  static async approveTask(id) {
    const reqQuery = await db.collection('requirements').where('reqId', '==', id).get();
    if (reqQuery.empty) throw new Error("Requirement not found");
    
    const reqDoc = reqQuery.docs[0];
    const reqData = reqDoc.data();

    const batch = db.batch();
    batch.update(reqDoc.ref, { 
      status: "Client UAT", 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    });

    const taskQuery = await db.collection('tasks').where('reqId', '==', id).get();
    taskQuery.forEach(doc => {
        if (!['Completed', 'Done'].includes(doc.data().status)) {
            batch.update(doc.ref, { status: "Client UAT" });
        }
    });

    await batch.commit();
    return { success: true };
  }

  static async rejectTask(id, reason) {
    const reqQuery = await db.collection('requirements').where('reqId', '==', id).get();
    if (reqQuery.empty) throw new Error("Requirement not found");
    
    const reqDoc = reqQuery.docs[0];
    const reqData = reqDoc.data();

    const batch = db.batch();
    batch.update(reqDoc.ref, { 
      status: "In Progress", 
      rejectionReason: reason, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    });

    const taskQuery = await db.collection('tasks').where('reqId', '==', id).get();
    taskQuery.forEach(doc => {
        if (doc.data().status === 'Pending Verification') {
            batch.update(doc.ref, { status: "In Progress" });
        }
    });
    
    await batch.commit();
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

    const usersSnap = await db.collection('users').get();
    let userMap = {};
    let fallbackDevName = "Developer Team";
    let fallbackDevImage = null;
    let fallbackDevOnline = false;

    usersSnap.forEach(doc => {
        const d = doc.data();
        const actualName = d.fullName || d.name;
        userMap[doc.id] = { name: actualName, profileImage: d.profileImage || d.photoURL || d.avatar || d.imageUrl || null, isOnline: d.isOnline || false };
        if (d.role === 'Developer' || d.role === 'Dev') { fallbackDevName = actualName; fallbackDevImage = userMap[doc.id].profileImage; fallbackDevOnline = d.isOnline || false; }
    });
    
    reqsSnap.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      
      if (!data.baId || data.baId === baId) {
          reqIds.push(reqId);

          let finalDevName = fallbackDevName;
          let finalDevImage = fallbackDevImage;
          let finalDevOnline = fallbackDevOnline;

          if (data.teamLeaderId && userMap[data.teamLeaderId]) {
              finalDevName = userMap[data.teamLeaderId].name; finalDevImage = userMap[data.teamLeaderId].profileImage; finalDevOnline = userMap[data.teamLeaderId].isOnline;
          } else if (data.teamLeaderName && data.teamLeaderName !== "Unassigned Team" && data.teamLeaderName !== "") {
              finalDevName = data.teamLeaderName; const matchedDev = Object.values(userMap).find(u => u.name === data.teamLeaderName);
              if (matchedDev) { finalDevImage = matchedDev.profileImage; finalDevOnline = matchedDev.isOnline; }
          }

          let rawClientName = getClientName(data);
          let finalClientName = rawClientName;
          let finalClientImage = null;
          let finalClientOnline = false;

          const clientId = data.uid || data.clientId;
          if (clientId && userMap[clientId]) {
              finalClientName = userMap[clientId].name; finalClientImage = userMap[clientId].profileImage; finalClientOnline = userMap[clientId].isOnline;
          } else {
              const matchedClient = Object.values(userMap).find(u => u.name === rawClientName);
              if (matchedClient) { finalClientImage = matchedClient.profileImage; finalClientOnline = matchedClient.isOnline; }
          }

          reqs.push({
            id: reqId, 
            title: data.title || "Untitled Requirement", 
            description: data.description || data.text || "No description provided.",
            fileName: data.fileName || null,
            fileData: data.fileData || data.fileUrl || null,
            clientName: finalClientName, clientImage: finalClientImage, clientIsOnline: finalClientOnline,
            devName: finalDevName, devImage: finalDevImage, devIsOnline: finalDevOnline, 
            unreadClient: 0, unreadDev: 0, unreadGroup: 0, lastActivity: data.updatedAt || data.submittedAt || { toMillis: () => 0 }
          });
      }
    });

    if (reqIds.length === 0) return [];
    
    const msgsSnap = await db.collection('messages').where('read', '==', false).get();
    msgsSnap.forEach(doc => {
      const msg = doc.data();
      if (msg.senderRole === 'BA' || msg.senderId === baId) return;

      if (reqIds.includes(msg.reqId)) {
        const targetReq = reqs.find(r => r.id === msg.reqId);
        if (targetReq) {
            
            if (msg.receiverRole === 'Group') {
                targetReq.unreadGroup++;
            } else if (msg.senderRole === 'Client' || msg.receiverRole === 'Client') {
                targetReq.unreadClient++;
            } else {
                targetReq.unreadDev++;
            }

            const msgTime = msg.createdAt || msg.timestamp;
            if (msgTime && (!targetReq.lastActivity || (msgTime.toMillis && msgTime.toMillis() > (targetReq.lastActivity.toMillis ? targetReq.lastActivity.toMillis() : 0)))) { 
                targetReq.lastActivity = msgTime; 
            }
        }
      }
    });

    reqs.sort((a, b) => (b.lastActivity?.toMillis?.() || 0) - (a.lastActivity?.toMillis?.() || 0));
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
      let isValidMessage = false;

      if (channel === 'Group') {
          isValidMessage = msg.receiverRole === 'Group';
      } else if (channel === 'Client') {
          isValidMessage = (msg.senderRole === 'Client' || msg.receiverRole === 'Client' || (msg.senderRole === 'BA' && msg.receiverRole === 'Client'));
      } else if (channel === 'Developer') {
          isValidMessage = (msg.senderRole === 'Developer' || msg.senderRole === 'Dev' || msg.receiverRole === 'Developer' || (msg.senderRole === 'BA' && msg.receiverRole === 'Developer'));
      }

      if (isValidMessage) {
        let realSenderName = msg.senderName;
        if (msg.senderId && userMap[msg.senderId]) realSenderName = userMap[msg.senderId];
        messages.push({ id: doc.id, ...msg, senderName: realSenderName, timeStr: new Date(msg.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      }
    });
    messages.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    return messages;
  }

  static async sendMessage(reqId, senderId, senderName, channel, text, fileData) {
    let actualName = senderName || "Business Analyst";
    if (senderId) {
      const userDoc = await db.collection('users').doc(senderId).get();
      if (userDoc.exists) { actualName = userDoc.data().fullName || userDoc.data().name || actualName; }
    }

    const newMsgRef = db.collection('messages').doc();
    const msgObj = { reqId, senderId, senderName: actualName, senderRole: "BA", receiverRole: channel, text: text || "", read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    if (fileData) { msgObj.fileName = fileData.name; msgObj.fileUrl = fileData.base64; msgObj.attachment = { name: fileData.name, type: fileData.type, dataUrl: fileData.base64 }; }
    await newMsgRef.set(msgObj);
    return { id: newMsgRef.id, ...msgObj, timeStr: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
  }

  static async markMessagesAsRead(reqId, channel) {
    const msgsSnap = await db.collection('messages').where('reqId', '==', reqId).where('read', '==', false).get();
    if (msgsSnap.empty) return { success: true, count: 0 };
    
    const batch = db.batch(); 
    let count = 0;
    
    msgsSnap.forEach(doc => { 
        const m = doc.data();
        let shouldMarkRead = false;

        if (channel === 'Group' && m.receiverRole === 'Group') shouldMarkRead = true;
        else if (channel === 'Client' && (m.senderRole === 'Client' || m.receiverRole === 'Client')) shouldMarkRead = true;
        else if (channel === 'Developer' && (m.senderRole === 'Developer' || m.senderRole === 'Dev' || m.receiverRole === 'Developer')) shouldMarkRead = true;

        if (shouldMarkRead) { 
            batch.update(doc.ref, { read: true }); 
            count++; 
        }
    });

    if (count > 0) await batch.commit();
    return { success: true, count };
  }
}

class BAProgressModel {
  static async getProgressData(baId) {
    // We need to fetch ALL requirements (unassigned, or assigned to me) for the new Client Timeline
    const allReqsSnap = await db.collection('requirements').get();
    let myReqs = [];
    let allSystemReqs = []; 
    let reqsThisWeek = 0;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    allReqsSnap.forEach(doc => {
        const data = doc.data();
        const reqDate = data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(0));

        if (data.baId === baId || !data.baId || data.baId === "") {
            allSystemReqs.push({ id: doc.id, ...data });
            
            if (reqDate > oneWeekAgo) reqsThisWeek++;
            
            if (data.baId === baId) {
                myReqs.push({ id: doc.id, ...data });
            }
        }
    });

    // 1. THE DEVELOPER TIMELINE (Math based, filtered)
    const tasksSnap = await db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }));
    let tasksByReq = {};

    if (!tasksSnap.empty) {
        tasksSnap.forEach(doc => {
            const t = doc.data();
            if (!tasksByReq[t.reqId]) tasksByReq[t.reqId] = { total: 0, completed: 0 };

            tasksByReq[t.reqId].total++;
            if (['Completed', 'Done', 'Client UAT', 'Pending Verification', 'Ready for Review'].includes(t.status)) {
                tasksByReq[t.reqId].completed++;
            }
        });
    }

    let timeline = [];
    const terminalStatuses = ['Completed', 'Done', 'Approved & Live', 'Closed'];

    myReqs.forEach(req => {
        const reqId = req.reqId || `REQ-${req.id.substring(0,4).toUpperCase()}`;
        const status = req.status || "Pending BA Review";
        const taskData = tasksByReq[reqId] || { total: 0, completed: 0 };

        if (taskData.total > 0 && !terminalStatuses.includes(status)) {
            let progress = Math.round((taskData.completed / taskData.total) * 100);

            let stage = 'To Do', stageColor = 'bg-gray-100 text-gray-600', barColor = 'bg-yellow-400';

            if (progress > 0 && progress < 80) {
               stage = 'Development'; stageColor = 'bg-blue-100 text-blue-700'; barColor = 'bg-[#007BFF]';
            } else if (progress >= 80 && progress < 100) {
               stage = 'Review'; stageColor = 'bg-yellow-100 text-yellow-700'; barColor = 'bg-green-600';
            } else if (progress === 100) {
               stage = 'Dev Complete'; stageColor = 'bg-green-100 text-green-700'; barColor = 'bg-green-500';
            }

            timeline.push({
                reqId,
                title: req.title || "Untitled Requirement",
                stage,
                stageColor,
                barColor,
                progress,
                rawDate: req.updatedAt || req.submittedAt || 0
            });
        }
    });

    timeline.sort((a,b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));

    // 2. THE NEW CLIENT TIMELINE (Stage mapping, ALL items)
    let clientTimeline = [];
    allSystemReqs.forEach(req => {
         const reqId = req.reqId || `REQ-${req.id.substring(0,4).toUpperCase()}`;
         
         clientTimeline.push({
             reqId,
             title: req.title || "Untitled Requirement",
             clientStage: req.status || "Pending BA Review",
             clientName: req.clientName || "Unknown Client",
             rawDate: req.updatedAt || req.submittedAt || 0
         });
    });

    clientTimeline.sort((a,b) => (b.rawDate?.toMillis ? b.rawDate.toMillis() : 0) - (a.rawDate?.toMillis ? a.rawDate.toMillis() : 0));

    // STATS
    let stats = { reqs: reqsThisWeek, tasks: 0, verifications: 0, changes: 0 };
    if (!tasksSnap.empty) {
        tasksSnap.forEach(doc => {
            const tDate = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(0);
            if (tDate > oneWeekAgo) stats.tasks++;
        });
    }
    const verificationsSnap = await db.collection('requirements').where('status', '==', 'Pending Verification').get();
    stats.verifications = verificationsSnap.size;

    const crSnap = await db.collection('change_requests').where('status', '==', 'Pending').get();
    stats.changes = crSnap.size;

    return { timeline, clientTimeline, stats };
  }
}

class BAUserModel {
  static async getSettings(uid) {
    if (!uid) return null;
    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      const initialData = { fullName: "", email: "", organization: "", role: "BA", profileImage: null, notifications: { email: true, inApp: true, weeklyDigest: false } };
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
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
      
    let notifications = []; 
    let unreadCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.isRead) unreadCount++;
      
      let timeStr = "Just now";
      if (data.createdAt) {
          const dateObj = data.createdAt.toDate();
          timeStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      notifications.push({ 
          id: doc.id, 
          title: data.title || "Update", 
          message: data.message || "", 
          isRead: data.isRead || false, 
          time: timeStr,
          link: data.link || '#'
      });
    });
    
    return { notifications, unreadCount };
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

module.exports = { BARequirementModel, BATaskModel, BAChangeModel, BAVerificationModel, BACommunicationModel, BACommunicationHubModel, BAProgressModel, BAUserModel };