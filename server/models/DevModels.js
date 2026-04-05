const { admin, db } = require('../config/firebase');

class DevDashboardModel {
  static async getDashboardData(devId) {
    const userDoc = await db.collection('users').doc(devId).get();
    const devData = userDoc.exists ? userDoc.data() : {};
    const devName = (devData.fullName || "UNKNOWN").toLowerCase();
    const devFirstName = devName.split(' ')[0];

    const allTasksSnap = await db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }));
    const allReqsSnap = await db.collection('requirements').get();

    let myTasks = [];
    let myReqs = [];

    const isMyData = (data) => {
        const dbLeaderId = data.teamLeaderId || "";
        const dbAssigneeId = data.assigneeId || "";
        const dbLeaderName = (data.teamLeaderName || "").toLowerCase();

        if (dbLeaderId === devId || dbAssigneeId === devId) return true;
        if (dbLeaderName && (dbLeaderName === devName || dbLeaderName.includes(devFirstName))) return true;
        if (['Sent to Engineering', 'In Progress', 'Pending Team Assignment', 'Modification Requested', 'Assigned'].includes(data.status)) {
            if (!dbLeaderId && !dbLeaderName) return true; 
        }
        return false;
    };

    if (!allTasksSnap.empty) {
        allTasksSnap.forEach(doc => {
            const t = doc.data();
            if (isMyData(t)) myTasks.push({ id: doc.id, ...t });
        });
    }

    allReqsSnap.forEach(doc => {
        const r = doc.data();
        if (isMyData(r)) myReqs.push({ id: doc.id, ...r });
    });

    let reqDeadlines = {};
    myReqs.forEach(req => {
      const reqId = req.reqId || `REQ-UNKNOWN`;
      const priority = (req.priority || 'Medium').toLowerCase();
      let daysToComplete = 21; 
      if (priority.includes('low')) daysToComplete = 28;
      else if (priority.includes('high') || priority.includes('urgent')) daysToComplete = 14;
      
      let startDate = new Date();
      if (req.submittedAt) startDate = req.submittedAt.toDate ? req.submittedAt.toDate() : new Date(req.submittedAt);
      else if (req.createdAt) startDate = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
      reqDeadlines[reqId] = new Date(startDate.getTime() + (daysToComplete * 24 * 60 * 60 * 1000));
    });

    let stats = { assigned: 0, inProgress: 0, completedProjects: 0, overdue: 0 };
    let tasksByReq = {};
    let recentActivity = [];
    const now = new Date();

    myTasks.forEach(task => {
      if (!tasksByReq[task.reqId]) tasksByReq[task.reqId] = { total: 0, completed: 0, started: 0 };
      tasksByReq[task.reqId].total++;

      if (task.status === 'In Progress') { 
        tasksByReq[task.reqId].started++; 
      }
      else if (['Client UAT', 'Completed', 'Done', 'Pending Verification'].includes(task.status)) {
        tasksByReq[task.reqId].completed++; 
        tasksByReq[task.reqId].started++; 
      }

      if (task.updatedAt) {
        let action = "Updated task details";
        let type = 'status'; 

        if (['Completed', 'Done', 'Pending Verification', 'Client UAT'].includes(task.status)) {
            action = `Completed task: "${task.title}"`;
            type = 'evidence'; 
        } else if (task.status === 'In Progress') {
            action = `Started working on task: "${task.title}"`;
        } else {
            action = `Updated task status to "${task.status}"`;
        }
        
        recentActivity.push({
          id: `act-${task.id}`, refId: task.displayId || task.taskId, text: action,
          timestamp: task.updatedAt, type: type
        });
      }
    });

    let requirementProgress = [];
    let newAssignments = []; 

    myReqs.forEach(req => {
      const reqId = req.reqId || `REQ-UNKNOWN`;
      const status = req.status || "Sent to Engineering";
      const actualDeadline = reqDeadlines[reqId];
      const taskData = tasksByReq[reqId] || { total: 0, completed: 0, started: 0 };
      let progress = taskData.total === 0 ? 0 : Math.round((taskData.completed / taskData.total) * 100);
      
      const isCompleted = ['Completed', 'Done', 'Pending Verification', 'Ready for Review', 'Client UAT'].includes(status);
      const isWorking = status === 'In Progress';

      if (isCompleted) {
        stats.completedProjects++;
      } else if (isWorking) {
        stats.inProgress++;
      } else {
        stats.assigned++; 
      }

      if (now > actualDeadline && !isCompleted) {
        stats.overdue++;
      }

      if (taskData.started === 0 && !isCompleted && status !== 'In Progress') {
        newAssignments.push({ reqId, title: req.title || "Untitled Requirement", taskCount: taskData.total, assignedAt: req.updatedAt || req.submittedAt || new Date() });
      } 
      else if (!['Completed', 'Done'].includes(status)) {
        let stage = 'To Do', stageColor = 'bg-gray-100 text-gray-600', barColor = 'bg-yellow-400';
        if (progress > 0 && progress < 80) { stage = 'Development'; stageColor = 'bg-blue-100 text-blue-700'; barColor = 'bg-[#007BFF]'; } 
        else if (progress >= 80 && progress < 100) { stage = 'Review'; stageColor = 'bg-yellow-100 text-yellow-700'; barColor = 'bg-green-600'; } 
        else if (progress === 100 && taskData.total > 0) { stage = 'Completed'; stageColor = 'bg-green-100 text-green-700'; barColor = 'bg-green-500'; }

        requirementProgress.push({ reqId, title: req.title || "Untitled Requirement", stage, stageColor, barColor, progress });
      }
    });

    recentActivity.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
    newAssignments.sort((a, b) => (b.assignedAt?.toMillis?.() || 0) - (a.assignedAt?.toMillis?.() || 0));
    
    const getTimeAgo = (ts) => {
      if (!ts) return "Just now";
      const seconds = Math.floor((new Date() - (ts.toDate ? ts.toDate() : new Date(ts))) / 1000);
      let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60; if (interval > 1) return Math.floor(interval) + " min ago";
      return "Just now";
    };

    return {
      stats,
      newAssignments: newAssignments.map(na => ({ ...na, timeAgo: getTimeAgo(na.assignedAt) })),
      requirementProgress: requirementProgress.sort((a,b) => b.progress - a.progress),
      recentActivity: recentActivity.slice(0, 5).map(act => ({ ...act, timeAgo: getTimeAgo(act.timestamp) }))
    };
  }

  static async searchRequirements(query, devId) {
    const cleanQuery = query.toLowerCase().replace(/[\s-]/g, '');
    let searchResults = [];
    const userDoc = await db.collection('users').doc(devId).get();
    const devData = userDoc.exists ? userDoc.data() : {};
    const devName = (devData.fullName || "UNKNOWN").toLowerCase();
    const devFirstName = devName.split(' ')[0];
    const reqSnapshot = await db.collection('requirements').get();
    
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const dbLeaderId = data.teamLeaderId || "";
      const dbLeaderName = (data.teamLeaderName || "").toLowerCase();
      const leaderMatch = dbLeaderId === devId || dbLeaderName === devName || dbLeaderName.includes(devFirstName) || (dbLeaderId && !dbLeaderName); 
      if (leaderMatch) {
        const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
        if (rawReqId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(query.toLowerCase()))) {
          searchResults.push({ id: rawReqId, title: data.title || 'Untitled', status: data.status || 'Assigned', type: "Requirement" });
        }
      }
    });
    return searchResults;
  }

  static async getMyTasksPageData(devId) {
    const userDoc = await db.collection('users').doc(devId).get();
    const devData = userDoc.exists ? userDoc.data() : {};
    const devName = (devData.fullName || "UNKNOWN").toLowerCase();
    const devFirstName = devName.split(' ')[0];

    const allTasksSnap = await db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }));
    const allReqsSnap = await db.collection('requirements').get();

    let myTasks = [];
    let myReqs = [];

    const isMyData = (data) => {
        const dbLeaderId = data.teamLeaderId || "";
        const dbAssigneeId = data.assigneeId || "";
        const dbLeaderName = (data.teamLeaderName || "").toLowerCase();

        if (dbLeaderId === devId || dbAssigneeId === devId) return true;
        if (dbLeaderName && (dbLeaderName === devName || dbLeaderName.includes(devFirstName))) return true;
        
        const status = data.status || "";
        if (['Sent to Engineering', 'In Progress', 'Pending Team Assignment', 'Modification Requested', 'Assigned', 'Ready for Review'].includes(status)) {
            if (!dbLeaderId || dbLeaderId === "unassigned" || !dbLeaderName) return true; 
        }
        return false;
    };

    if (!allTasksSnap.empty) {
        allTasksSnap.forEach(doc => {
            const t = doc.data();
            if (isMyData(t)) myTasks.push({ id: doc.id, docId: doc.id, ...t });
        });
    }

    allReqsSnap.forEach(doc => {
        const r = doc.data();
        if (isMyData(r)) myReqs.push({ id: doc.id, dbId: doc.id, ...r });
    });

    let result = [];
    myReqs.forEach(req => {
      const reqId = req.reqId || `REQ-${req.id.substring(0,4).toUpperCase()}`;
      
      const priority = (req.priority || 'Medium').toLowerCase();
      let daysToComplete = 21; 
      if (priority.includes('low')) daysToComplete = 28;
      else if (priority.includes('high') || priority.includes('urgent')) daysToComplete = 14;
      
      let startDate = new Date();
      if (req.submittedAt) startDate = req.submittedAt.toDate ? req.submittedAt.toDate() : new Date(req.submittedAt);
      else if (req.createdAt) startDate = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
      const deadline = new Date(startDate.getTime() + (daysToComplete * 24 * 60 * 60 * 1000));

      let description = req.description || req.text || "No text description provided by client.";
      let baAnalysis = req.aiProcessedData || req.analysis || req.baAnalysis || req.processedData || null;

      let clientName = req.clientName || req.clientFullName || req.requestedBy || req.submittedBy || req.author || (req.client && req.client.name) || "Unknown Client";
      let clientOrg = req.clientOrg || req.organization || req.companyName || (req.client && req.client.organization) || "";
      
      let attachments = [];
      if (req.attachments && Array.isArray(req.attachments)) attachments = req.attachments;
      else if (req.files && Array.isArray(req.files)) attachments = req.files;
      else if (req.fileUrl) attachments = [{ name: req.fileName || 'Attached Document', url: req.fileUrl }];

      let reqTasks = myTasks.filter(t => t.reqId === reqId);
      reqTasks.sort((a, b) => {
        const numA = parseInt((a.taskId || "").split('-').pop(), 10) || 0;
        const numB = parseInt((b.taskId || "").split('-').pop(), 10) || 0;
        return numA - numB;
      });

      result.push({
        dbId: req.dbId, 
        reqId: reqId,
        title: req.title || "Untitled Requirement",
        priority: req.priority || "Medium",
        status: req.status || "Sent to Engineering",
        baName: req.baName || "Business Analyst",
        clientName: clientName, 
        clientOrg: clientOrg, 
        attachments: attachments, 
        submittedAt: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        deadline: deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isOverdue: new Date() > deadline && req.status !== 'Completed' && req.status !== 'Done',
        description: description,
        baAnalysis: baAnalysis, 
        tasks: reqTasks,
        rejectionReason: req.rejectionReason || null,
        isChangeRequest: req.isChangeRequest || req.status === 'Modification Requested' || req.status === 'Change Requested'
      });
    });

    result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return result;
  }

  static async updateTaskStatus(taskId, newStatus) {
    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef.where('taskId', '==', taskId).get();
    if (snapshot.empty) throw new Error("Task not found");
    
    const taskDoc = snapshot.docs[0];
    await taskDoc.ref.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, taskId, newStatus };
  }

  static async updateRequirementStatus(dbId, newStatus) {
    await db.collection('requirements').doc(dbId).update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, dbId, newStatus };
  }

  static async getChatList(devId) {
    const myProjects = await this.getMyTasksPageData(devId);
    
    const usersSnap = await db.collection('users').get();
    let userMap = {};
    let fallbackBaName = "Business Analyst";
    let fallbackBaImage = null;
    let fallbackBaOnline = false;

    usersSnap.forEach(doc => {
        const d = doc.data();
        const actualName = d.fullName || d.name;
        userMap[doc.id] = {
            name: actualName,
            profileImage: d.profileImage || null,
            isOnline: d.isOnline || false
        };
        if (d.role === 'BA' || d.role === 'Business Analyst') {
            fallbackBaName = actualName;
            fallbackBaImage = d.profileImage || null;
            fallbackBaOnline = d.isOnline || false;
        }
    });

    const msgsSnap = await db.collection('messages').get().catch(() => ({ empty: true, forEach: () => {} }));
    let allMsgs = [];
    if (!msgsSnap.empty) {
        msgsSnap.forEach(d => allMsgs.push({ id: d.id, ...d.data() }));
    }

    let chatList = [];
    
    myProjects.forEach(req => {
        let reqMsgs = allMsgs.filter(m => {
            if (m.reqId !== req.reqId) return false;
            if (m.receiverRole === 'Client' || m.senderRole === 'Client') return false;

            const isFromDev = m.senderId === devId || m.senderRole === 'Developer' || m.senderRole === 'Dev';
            const isToDev = m.receiverId === devId || m.receiverRole === 'Developer';
            
            return isFromDev || isToDev;
        });
        
        reqMsgs.sort((a, b) => (a.createdAt?.toMillis?.() || a.timestamp?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || b.timestamp?.toMillis?.() || 0));

        let unreadCount = reqMsgs.filter(m => (m.receiverId === devId || m.receiverRole === 'Developer') && m.read === false).length;
        
        let lastMessage = "No messages yet";
        if (reqMsgs.length > 0) {
            const lastMsg = reqMsgs[reqMsgs.length - 1];
            lastMessage = lastMsg.text || (lastMsg.attachment ? "📎 Attached a file" : "No messages yet");
        }

        let baId = req.baId || req.userId || "ba-admin";
        
        let finalBaName = fallbackBaName;
        let finalBaImage = fallbackBaImage;
        let finalBaOnline = fallbackBaOnline;

        if (req.baId && userMap[req.baId]) {
            finalBaName = userMap[req.baId].name;
            finalBaImage = userMap[req.baId].profileImage;
            finalBaOnline = userMap[req.baId].isOnline;
        } else if (req.baName && req.baName !== "Business Analyst" && req.baName !== "") {
            finalBaName = req.baName;
        }

        chatList.push({
            reqId: req.reqId,
            title: req.title,
            baId: baId,
            baName: finalBaName,
            baImage: finalBaImage, 
            isOnline: finalBaOnline, 
            unreadCount: unreadCount,
            lastMessage: lastMessage,
            tasks: req.tasks.map(t => ({ taskId: t.taskId, displayId: t.displayId || t.taskId, title: t.title }))
        });
    });

    return chatList;
  }

  static async getMessages(devId, reqId) {
    const msgsSnap = await db.collection('messages').where('reqId', '==', reqId).get();
    let msgs = [];
    let batch = db.batch();

    msgsSnap.forEach(doc => {
        const m = doc.data();
        if (m.receiverRole === 'Client' || m.senderRole === 'Client') return;

        const isFromDev = m.senderId === devId || m.senderRole === 'Developer' || m.senderRole === 'Dev';
        const isToDev = m.receiverId === devId || m.receiverRole === 'Developer';
        
        if (isFromDev || isToDev) {
            msgs.push({ id: doc.id, ...m });
            if (isToDev && m.read === false) {
                batch.update(doc.ref, { read: true });
            }
        }
    });

    await batch.commit(); 
    msgs.sort((a, b) => (a.createdAt?.toMillis?.() || a.timestamp?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || b.timestamp?.toMillis?.() || 0));
    return msgs.map(m => ({
        ...m,
        timestamp: m.createdAt?.toDate?.() || m.timestamp?.toDate?.() || new Date()
    }));
  }

  static async sendMessage(data) {
    const docRef = await db.collection('messages').add({
        reqId: data.reqId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        senderName: data.senderName,
        senderRole: "Developer", 
        text: data.text || "",
        taskId: data.taskId || null, 
        attachment: data.attachment || null, 
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(), 
        read: false
    });
    return { success: true, messageId: docRef.id };
  }

  static async getPendingSubmissions(devId) { return await this.getEvidenceQueue(devId); }
  static async getEvidence(devId) { return await this.getEvidenceQueue(devId); }

  static async getEvidenceQueue(devId) {
    const reqSnapshot = await db.collection('requirements').get();
    let queue = [];

    const userDoc = await db.collection('users').doc(devId).get();
    const devData = userDoc.exists ? userDoc.data() : {};
    const devName = (devData.fullName || "").toLowerCase();
    const devFirstName = devName.split(' ')[0];

    reqSnapshot.forEach(doc => {
        const req = doc.data();
        const status = req.status || "";
        
        const dbLeaderId = req.teamLeaderId || "";
        const dbLeaderName = (req.teamLeaderName || "").toLowerCase();

        const isAssigned = (dbLeaderId === devId) || (dbLeaderName === devName) || (dbLeaderName.includes(devFirstName) && devFirstName.length > 2);
        const isFallbackActive = !dbLeaderId && ['Sent to Engineering', 'In Progress', 'Modification Requested', 'Change Requested', 'Ready for Review'].includes(status);

        if (isAssigned || isFallbackActive) {
            const blockedTerminalStatuses = ['Completed', 'Done', 'Approved & Live', 'Closed', 'Client UAT'];

            if (!blockedTerminalStatuses.includes(status) || req.rejectionReason) {
                queue.push({
                    id: doc.id,
                    reqId: req.reqId || `REQ-${doc.id.substring(0,4).toUpperCase()}`,
                    title: req.title || "Untitled",
                    status: status,
                    rejectionReason: req.rejectionReason || null,
                    isChangeRequest: req.isChangeRequest || status === 'Modification Requested' || status === 'Change Requested',
                    evidence: req.evidence || null
                });
            }
        }
    });

    return queue.sort((a, b) => {
        if (a.rejectionReason && !b.rejectionReason) return -1;
        if (!a.rejectionReason && b.rejectionReason) return 1;
        return a.title.localeCompare(b.title);
    });
  }

  static async submitRequirementEvidence(reqId, evidenceData, devId) {
    const reqRef = db.collection('requirements').where('reqId', '==', reqId);
    const snapshot = await reqRef.get();
    if (snapshot.empty) throw new Error("Requirement not found");

    const reqDoc = snapshot.docs[0];
    const batch = db.batch();

    batch.update(reqDoc.ref, {
        status: "Pending Verification",
        evidence: {
            files: evidenceData.files || [],
            githubLink: evidenceData.githubLink || "",
            notes: evidenceData.notes || ""
        },
        rejectionReason: admin.firestore.FieldValue.delete(), 
        verificationSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const tasksSnap = await db.collection('tasks').where('reqId', '==', reqId).get();
    if (!tasksSnap.empty) {
        tasksSnap.forEach(t => {
            if (!['Completed', 'Done', 'Client UAT'].includes(t.data().status)) {
                batch.update(t.ref, { 
                  status: "Pending Verification", 
                  updatedAt: admin.firestore.FieldValue.serverTimestamp() 
                });
            }
        });
    }

    const updateActiveCRs = async (collectionName) => {
        const crSnap = await db.collection(collectionName).where('reqId', '==', reqId).get();
        crSnap.forEach(cr => {
            const crStatus = cr.data().status;
            if (['In Development', 'Approved', 'In Progress', 'Pending'].includes(crStatus)) {
                batch.update(cr.ref, { status: 'Pending Verification', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        });
    };

    await updateActiveCRs('change_requests');
    await updateActiveCRs('changeRequests');

    await batch.commit();
    return { success: true, reqId };
  }

  static async getPerformanceData(devId) {
    const userDoc = await db.collection('users').doc(devId).get();
    const devData = userDoc.exists ? userDoc.data() : {};
    const devName = (devData.fullName || "UNKNOWN").toLowerCase();
    const devFirstName = devName.split(' ')[0];

    const isMyTask = (data) => {
        const dbLeaderId = data.teamLeaderId || "";
        const dbAssigneeId = data.assigneeId || "";
        const dbLeaderName = (data.teamLeaderName || "").toLowerCase();
        if (dbLeaderId === devId || dbAssigneeId === devId) return true;
        if (dbLeaderName && (dbLeaderName === devName || dbLeaderName.includes(devFirstName))) return true;
        return false;
    };

    const allReqsSnap = await db.collection('requirements').get();
    let reqDeadlines = {};
    allReqsSnap.forEach(doc => {
      const req = doc.data();
      const reqId = req.reqId;
      if (!reqId) return;

      const priority = (req.priority || 'Medium').toLowerCase();
      let daysToComplete = 21; 
      if (priority.includes('low')) daysToComplete = 28;
      else if (priority.includes('high') || priority.includes('urgent')) daysToComplete = 14;
      
      let startDate = new Date();
      if (req.submittedAt) startDate = req.submittedAt.toDate ? req.submittedAt.toDate() : new Date(req.submittedAt);
      else if (req.createdAt) startDate = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
      
      reqDeadlines[reqId] = new Date(startDate.getTime() + (daysToComplete * 24 * 60 * 60 * 1000));
    });

    const allTasksSnap = await db.collection('tasks').get();
    const now = new Date();
    
    const week4Start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const week3Start = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const week2Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const week1Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let stats = {
        completedThisWeek: 0,
        onTimeThisWeek: 0,
        totalCompletionDays: 0,
        activeTasks: 0
    };

    let weeklyData = [
        { week: 'Week 4', onTime: 0, late: 0, rawDate: week4Start },
        { week: 'Week 3', onTime: 0, late: 0, rawDate: week3Start },
        { week: 'Week 2', onTime: 0, late: 0, rawDate: week2Start },
        { week: 'Week 1', onTime: 0, late: 0, rawDate: week1Start }
    ];

    let recentCompletions = [];

    allTasksSnap.forEach(doc => {
        const task = doc.data();
        if (!isMyTask(task)) return;

        const isDone = ['Completed', 'Done', 'Client UAT', 'Pending Verification'].includes(task.status);
        
        if (!isDone && task.status !== 'Unassigned') {
            stats.activeTasks++;
            return;
        }

        if (isDone && task.updatedAt) {
            const completedAt = task.updatedAt.toDate ? task.updatedAt.toDate() : new Date(task.updatedAt);
            const createdAt = task.createdAt?.toDate ? task.createdAt.toDate() : (task.createdAt ? new Date(task.createdAt) : new Date(completedAt.getTime() - 3 * 24 * 60 * 60 * 1000));
            
            const reqDeadline = reqDeadlines[task.reqId] || new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
            const isLate = completedAt > reqDeadline;
            
            let targetWeek = null;
            if (completedAt >= week1Start) targetWeek = 3; 
            else if (completedAt >= week2Start) targetWeek = 2;
            else if (completedAt >= week3Start) targetWeek = 1;
            else if (completedAt >= week4Start) targetWeek = 0;

            if (targetWeek !== null) {
                if (isLate) weeklyData[targetWeek].late++;
                else weeklyData[targetWeek].onTime++;
            }

            if (completedAt >= week1Start) {
                stats.completedThisWeek++;
                if (!isLate) stats.onTimeThisWeek++;
                
                const daysToComplete = (completedAt - createdAt) / (1000 * 60 * 60 * 24);
                stats.totalCompletionDays += Math.max(0.5, daysToComplete); 
            }

            recentCompletions.push({
                id: doc.id,
                taskId: task.displayId || task.taskId,
                title: task.title,
                status: isLate ? 'Late' : 'On Time',
                dateStr: completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rawDate: completedAt
            });
        }
    });

    const onTimeRate = stats.completedThisWeek === 0 ? 100 : Math.round((stats.onTimeThisWeek / stats.completedThisWeek) * 100);
    const avgDays = stats.completedThisWeek === 0 ? 0 : (stats.totalCompletionDays / stats.completedThisWeek).toFixed(1);

    recentCompletions.sort((a, b) => b.rawDate - a.rawDate);
    weeklyData.reverse();

    return {
        success: true,
        stats: {
            completed: stats.completedThisWeek,
            onTimeRate: onTimeRate,
            avgDays: avgDays,
            activeTasks: stats.activeTasks
        },
        weeklyData: weeklyData.map(w => ({ week: w.week, onTime: w.onTime, late: w.late })),
        recentCompletions: recentCompletions.slice(0, 6)
    };
  }
}

class DevUserModel {
  static async getSettings(uid) {
    if (!uid) return null;
    const docRef = db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      const initialData = { 
        fullName: "", email: "", organization: "", role: "Developer", profileImage: null, 
        specialty: [], 
        notifications: { email: true, inApp: true, weeklyDigest: false } 
      };
      await docRef.set(initialData); 
      return initialData;
    }
    return doc.data();
  }

  static async updateGeneralSettings(uid, data) {
    if (!uid) throw new Error("UID missing");
    
    const updatePayload = { 
        fullName: data.fullName, 
        email: data.email, 
        organization: data.organization, 
        profileImage: data.profileImage || null,
        specialty: data.specialty || [] 
    };
    
    await db.collection('users').doc(uid).update(updatePayload);
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

module.exports = { DevDashboardModel, DevUserModel };