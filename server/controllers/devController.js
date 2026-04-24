const { DevDashboardModel, DevUserModel } = require('../models/DevModels');
const { db } = require('../config/firebase');
const { sendNotification } = require('../services/notificationService'); 

const getDashboardData = async (req, res) => {
  try {
    const data = await DevDashboardModel.getDashboardData(req.uid);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const searchRequirements = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.json({ success: true, data: [] });
    const data = await DevDashboardModel.searchRequirements(query, req.uid);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getMyTasksPageData = async (req, res) => {
  try {
    const data = await DevDashboardModel.getMyTasksPageData(req.uid);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId, status } = req.body;
    await DevDashboardModel.updateTaskStatus(taskId, status);

    if (status === 'Completed' || status === 'Ready for Review') {
        let reqId = null;
        
        const taskSnap = await db.collection('tasks').where('taskId', '==', taskId).get();
        if (!taskSnap.empty) {
            reqId = taskSnap.docs[0].data().reqId;
        } else {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (taskDoc.exists) reqId = taskDoc.data().reqId;
        }

        if (reqId) {
            let baId = null;
            const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
            if (!reqSnap.empty) baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
            else {
                const reqDoc = await db.collection('requirements').doc(reqId).get();
                if (reqDoc.exists) baId = reqDoc.data().baId || reqDoc.data().claimedBy;
            }

            if (baId) {
                await sendNotification({
                    recipientId: baId,
                    title: "Task Status Updated",
                    message: `A developer has marked Task ${taskId} as ${status}.`,
                    type: "Task",
                    link: "/ba/verification"
                });
            }
        }
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateRequirementStatus = async (req, res) => {
  try {
    const { dbId, status } = req.body;
    await DevDashboardModel.updateRequirementStatus(dbId, status);

    if (status === 'Ready for Review') {
        const reqDoc = await db.collection('requirements').doc(dbId).get();
        if (reqDoc.exists) {
            const baId = reqDoc.data().baId || reqDoc.data().claimedBy;
            const reqId = reqDoc.data().reqId || "a project";
            
            if (baId) {
                await sendNotification({
                    recipientId: baId,
                    title: "Project Ready for Review",
                    message: `A developer has completed all tasks for ${reqId} and is preparing to submit evidence.`,
                    type: "System",
                    link: "/ba/dashboard"
                });
            }
        }
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getChatList = async (req, res) => {
  try {
    const data = await DevDashboardModel.getChatList(req.uid);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- NEW: Gets the channel query to pull the correct chat tab ---
const getMessages = async (req, res) => {
  try {
    const channel = req.query.channel || 'BA'; 
    const data = await DevDashboardModel.getMessages(req.uid, req.params.reqId, channel);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- NEW: Forwards the body to the Model which now handles the 'channel' property ---
const sendMessage = async (req, res) => {
  try {
    const result = await DevDashboardModel.sendMessage(req.body);

    if (req.body.reqId) {
        let baId = null;
        const reqSnap = await db.collection('requirements').where('reqId', '==', req.body.reqId).get();
        
        if (!reqSnap.empty) {
            baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
        } else {
            const reqDoc = await db.collection('requirements').doc(req.body.reqId).get();
            if (reqDoc.exists) baId = reqDoc.data().baId || reqDoc.data().claimedBy;
        }

        // Only notify the BA if it was a direct message to them
        if (baId && req.body.channel !== 'Group') {
            await sendNotification({
                recipientId: baId,
                title: "New Message from Developer",
                message: `${req.body.senderName || "A developer"} sent a message regarding project ${req.body.reqId}.`,
                type: "Communication",
                link: "/ba/communication"
            });
        }
    }

    res.json(result);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getPendingSubmissions = async (req, res) => {
  try {
      const data = await DevDashboardModel.getPendingSubmissions(req.uid);
      res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const submitRequirementEvidence = async (req, res) => {
  try {
      const reqId = req.params.reqId; 
      const evidenceData = req.body;  
      const result = await DevDashboardModel.submitRequirementEvidence(reqId, evidenceData, req.uid);

      let baId = null;
      const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
      
      if (!reqSnap.empty) {
          baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
      } else {
          const reqDoc = await db.collection('requirements').doc(reqId).get();
          if (reqDoc.exists) baId = reqDoc.data().baId || reqDoc.data().claimedBy;
      }

      if (baId) {
          await sendNotification({
              recipientId: baId,
              title: "Task Evidence Submitted",
              message: `A developer has submitted evidence for requirement ${reqId}. It is ready for your verification.`,
              type: "Verification",
              link: "/ba/verification"
          });
      }

      res.json(result);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getPerformanceData = async (req, res) => {
  try {
      const data = await DevDashboardModel.getPerformanceData(req.uid);
      res.json(data);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- SETTINGS AND NOTIFICATIONS ---
const getSettings = async (req, res) => {
  try {
    const data = await DevUserModel.getSettings(req.uid);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateGeneralSettings = async (req, res) => {
  try {
    await DevUserModel.updateGeneralSettings(req.uid, req.body);
    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateSecuritySettings = async (req, res) => {
  try {
    await DevUserModel.updateSecuritySettings(req.uid, req.body.newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    await DevUserModel.updateNotificationSettings(req.uid, key, value);
    res.json({ success: true, message: "Notification settings updated" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getNotifications = async (req, res) => {
  try {
    const data = await DevUserModel.getNotifications(req.uid);
    res.json({ success: true, data: data.notifications, unreadCount: data.unreadCount });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const markNotificationsRead = async (req, res) => {
  try {
    await DevUserModel.markNotificationsRead(req.uid);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = {
  getDashboardData, searchRequirements, getMyTasksPageData, updateTaskStatus,
  updateRequirementStatus,
  getChatList, getMessages, sendMessage,
  getPendingSubmissions, submitRequirementEvidence,
  getPerformanceData,
  getSettings, updateGeneralSettings, updateSecuritySettings, updateNotificationSettings,
  getNotifications, markNotificationsRead
};