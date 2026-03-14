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

const getClientName = (data) => {
  return data.clientName || data.submittedBy || data.userFullName || data.userName || data.fullName || "Unknown Client";
};

// FIXED: Specifically extract Priority for standard requirements
const getPriority = (data) => {
  const rawPriority = (data.priority || data.priorityLevel || "Medium").toLowerCase();
  if (rawPriority.includes("high") || rawPriority.includes("urgent")) return "High";
  if (rawPriority.includes("low")) return "Low";
  return "Medium";
};

// FIXED: Specifically extract Risk for Change Requests
const getChangeRisk = (data) => {
  const rawRisk = (data.changeRisk || data.riskLevel || data.risk || "Medium").toLowerCase();
  if (rawRisk.includes("high") || rawRisk.includes("critical")) return "High";
  if (rawRisk.includes("low")) return "Low";
  return "Medium";
};

// --- 1. GET BA DASHBOARD OVERVIEW ---
const getDashboardOverview = async (req, res) => {
  try {
    const [reqSnapshot, devsSnapshot, tasksSnapshot, messagesSnapshot] = await Promise.all([
      db.collection('requirements').get(),
      db.collection('users').where('role', '==', 'Developer').get(),
      db.collection('tasks').where('status', 'in', ['To Do', 'In Progress', 'In Review']).get().catch(() => ({ empty: true, forEach: () => {} })), 
      db.collection('messages').where('senderRole', '==', 'Developer').get().catch(() => ({ empty: true, forEach: () => {} })) 
    ]);
    
    let pendingReviews = 0;
    let verificationQueueCount = 0;
    let criticalRisks = 0;
    let activeReqs = 0;
    
    let rawInbox = []; 
    let rawChangeRequests = [];
    let rawVerificationQueue = []; 
    
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      const clientName = getClientName(data);
      
      // Inbox Data
      if (data.status === "Pending BA Review") {
        pendingReviews++;
        rawInbox.push({ id: rawReqId, title: data.title || "Untitled Request", client: clientName, rawDate: data.submittedAt || 0, time: getTimeAgo(data.submittedAt) });
      }

      // FIXED: Change Requests & Critical Risk Counter
      if (data.status === "Modification Requested") {
        const changeRisk = getChangeRisk(data);
        
        // ONLY count as a Critical Risk if it is a change request AND the risk is High
        if (changeRisk === "High") {
            criticalRisks++;
        }

        rawChangeRequests.push({ 
            id: rawReqId, 
            title: data.lastChangeType ? `${data.lastChangeType} — "${data.title}"` : `Change Request — "${data.title}"`, 
            from: clientName, 
            time: getTimeAgo(data.changeRequestedAt || data.submittedAt), 
            risk: changeRisk, 
            rawDate: data.changeRequestedAt || data.submittedAt || 0 
        });
      }
      
      // Verification Queue Logic
      if (data.status === "Awaiting Verification" || data.status === "Pending Verification") {
        verificationQueueCount++;
        rawVerificationQueue.push({ id: rawReqId, title: data.title || "Untitled Update", dev: data.developerName || data.assignedTo || "Unknown Developer", date: formatShortDate(data.verificationSubmittedAt || data.submittedAt), rawDate: data.verificationSubmittedAt || data.submittedAt || 0 });
      }

      // Stats logic
      if (data.status === "In Analysis" || data.status === "In Progress") activeReqs++;
    });

    // DEVELOPER WORKLOAD LOGIC
    let devLoadMap = {};
    devsSnapshot.forEach(doc => {
      const dev = doc.data();
      devLoadMap[dev.fullName] = { name: dev.fullName, count: 0 };
    });

    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        if (task.assignee && devLoadMap[task.assignee]) devLoadMap[task.assignee].count++;
      });
    }

    let developerLoad = Object.values(devLoadMap);
    if (developerLoad.length === 0) {
      developerLoad = [
        { name: "Naveen Dilhan", count: 7 }, { name: "Dewni Witharana", count: 5 }, { name: "Sheran Ashintha", count: 4 }, { name: "Shenon Lekamge", count: 3 }, { name: "Induranga Dilshan", count: 2 }
      ];
    }
    developerLoad.sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...developerLoad.map(d => d.count), 8);
    developerLoad = developerLoad.map(dev => {
      let color = "bg-[#10B981]"; 
      let textColor = "text-white";
      if (dev.count >= 7) { color = "bg-gray-100"; textColor = "text-gray-400"; } 
      else if (dev.count >= 5) { color = "bg-yellow-500"; } 
      else if (dev.count >= 4) { color = "bg-[#0A66C2]"; }
      return { name: dev.name, count: dev.count, color: color, textColor: textColor, widthPercent: Math.max((dev.count / maxCount) * 100, 5) };
    });

    // DEVELOPER UPDATES LOGIC
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

    const dashboardData = {
      stats: { pendingReviews, verificationQueue: verificationQueueCount, criticalRisks, activeRequirements: activeReqs },
      inbox: rawInbox.slice(0, 3), 
      changeRequests: rawChangeRequests.slice(0, 3), 
      developerLoad: developerLoad, 
      verificationQueue: rawVerificationQueue.slice(0, 4), 
      developerUpdates: rawDeveloperUpdates.slice(0, 3) 
    };

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error("[Backend Error - BA Overview]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 2. GET REQUIREMENT INBOX PAGE DATA ---
const getInboxRequirements = async (req, res) => {
  try {
    const reqSnapshot = await db.collection('requirements')
      .where('status', '==', 'Pending BA Review')
      .get();

    let inbox = [];
    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const clientName = getClientName(data);
      const priorityLevel = getPriority(data); // FIXED: Grab Priority, not Risk!
      
      let type = 'Text';
      if (data.fileUrl || data.fileName || data.attachments || data.type === 'File') {
        type = 'File';
      }

      inbox.push({
        dbId: doc.id,
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: data.title || 'Untitled Requirement',
        description: data.description || data.text || 'No description provided.',
        submitter: clientName,
        company: data.company || data.companyName || 'Cargills Corporation', 
        priority: priorityLevel, // FIXED: Sent as priority
        type: type,
        fileName: data.fileName || 'document.pdf',
        fileUrl: data.fileUrl || null,
        fullDate: formatFullDate(data.submittedAt),
        timeAgo: getTimeAgo(data.submittedAt),
        rawDate: data.submittedAt || 0,
        isNew: true 
      });
    });

    inbox.sort((a, b) => {
      const dateA = a.rawDate?.toMillis ? a.rawDate.toMillis() : 0;
      const dateB = b.rawDate?.toMillis ? b.rawDate.toMillis() : 0;
      return dateB - dateA;
    });

    res.json({ success: true, data: inbox });
  } catch (error) {
    console.error("[Backend Error - BA Inbox]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 3. BA SEARCH ---
const searchAllItems = async (req, res) => {
  try {
    const rawQuery = req.query.q || '';
    if (!rawQuery.trim()) return res.json({ success: true, data: [] });
    const cleanQuery = rawQuery.toLowerCase().replace(/[\s-]/g, '');
    const standardQuery = rawQuery.toLowerCase();
    let searchResults = [];

    const [reqSnapshot, taskSnapshot] = await Promise.all([
      db.collection('requirements').get(),
      db.collection('tasks').get().catch(() => ({ empty: true, forEach: () => {} }))
    ]);

    reqSnapshot.forEach(doc => {
      const data = doc.data();
      const rawReqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;
      if (rawReqId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(standardQuery))) {
        searchResults.push({ id: rawReqId, title: data.title || 'Untitled', status: data.status || 'Unknown', type: "Requirement" });
      }
    });

    if (!taskSnapshot.empty) {
      taskSnapshot.forEach(doc => {
        const data = doc.data();
        const rawTaskId = data.taskId || `TASK-${doc.id.substring(0, 4).toUpperCase()}`;
        if (rawTaskId.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery) || (data.title && data.title.toLowerCase().includes(standardQuery))) {
          searchResults.push({ id: rawTaskId, title: data.title || 'Untitled', status: data.status || 'Unknown', type: "Task" });
        }
      });
    }

    res.json({ success: true, data: searchResults });
  } catch (error) {
    console.error("[Backend Error - BA Search]:", error);
    res.status(500).json({ success: false });
  }
};

module.exports = { getDashboardOverview, getInboxRequirements, searchAllItems };