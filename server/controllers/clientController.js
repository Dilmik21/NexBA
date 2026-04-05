const { RequirementModel, CommunicationModel, UserModel } = require('../models/ClientModels');
const { db } = require('../config/firebase');
const { sendNotification } = require('../services/notificationService'); 

const requireUid = (req, res, next) => {
  const uid = req.headers?.['x-user-uid'] || req.query?.uid || req.body?.uid;
  if (!uid) return res.status(401).json({ success: false, message: "Unauthorized: Missing user identity." });
  req.uid = uid; 
  next();
};

const submitProject = async (req, res) => {
  try {
    const customReqId = await RequirementModel.submitProject(req.body, req.uid);

    // --- 🚨 NOTIFICATION: Send "Receipt" to Client 🚨 ---
    await sendNotification({
        recipientId: req.uid,
        title: "Project Submitted Successfully",
        message: `We have received your project requirement (${customReqId}). A Business Analyst will review and claim it shortly!`,
        type: "System",
        link: "/client/requests"
    });

    res.json({ success: true, id: customReqId });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOverviewStats = async (req, res) => {
  try {
    const stats = await RequirementModel.getOverviewStats(req.uid);
    res.json({ success: true, stats });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getProjectProgress = async (req, res) => {
  try {
    const requirementsList = await RequirementModel.getProjectProgress(req.uid);
    res.json({ success: true, data: { lastUpdated: new Date().toLocaleTimeString(), requirements: requirementsList } });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getChangeRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getChangeRequests(req.uid);
    res.json({ success: true, data: requests });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getActionItems = async (req, res) => {
  try {
    const items = await RequirementModel.getActionItems(req.uid);
    res.json({ success: true, data: items });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getRecentActivity = async (req, res) => {
  try {
    const activities = await RequirementModel.getRecentActivity(req.uid);
    res.json({ success: true, data: activities });
  } catch (error) { res.status(500).json({ success: false }); }
};

const searchRequirements = async (req, res) => {
  try {
    const searchQuery = req.query.q?.toLowerCase() || '';
    if (!searchQuery) return res.json({ success: true, data: [] });
    const searchResults = await RequirementModel.searchRequirements(searchQuery, req.uid);
    res.json({ success: true, data: searchResults });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getAllRequests(req.uid);
    res.json({ success: true, data: requests });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getClarifications = async (req, res) => {
  try {
    const clarifications = await CommunicationModel.getClarifications(req.uid);
    res.json({ success: true, data: clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

// -------------------------------------------------------------
// FIXED: Pull reqId from req.body to properly find the BA!
// -------------------------------------------------------------
const answerClarification = async (req, res) => {
  try {
    const { id } = req.params; // Clarification Doc ID
    const { answer, fileName, fileData, reqId } = req.body; 
    await CommunicationModel.answerClarification(id, answer, fileName, fileData);

    // --- 🚨 NOTIFICATION: Find the BA and Alert Them 🚨 ---
    if (reqId) {
        let baId = null;
        const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
        if (!reqSnap.empty) {
            baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
        } else {
            const docRef = await db.collection('requirements').doc(reqId).get();
            if (docRef.exists) baId = docRef.data().baId || docRef.data().claimedBy;
        }

        if (baId) {
            await sendNotification({
                recipientId: baId,
                title: "Clarification Answered",
                message: `The client has responded to your clarification questions for requirement ${reqId}.`,
                type: "Communication",
                link: "/ba/inbox"
            });
        }
    }

    res.json({ success: true, message: "Answer submitted successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getChatProjects = async (req, res) => {
  try {
      const projects = await CommunicationModel.getChatProjects(req.uid);
      res.json({ success: true, data: projects });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getProjectMessages = async (req, res) => {
  try {
      const msgs = await CommunicationModel.getMessagesForProject(req.params.reqId);
      res.json({ success: true, data: msgs });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendProjectMessage = async (req, res) => {
  try {
      const { text, fileData, senderName } = req.body;
      const { reqId } = req.params;
      const newMsg = await CommunicationModel.sendMessage(reqId, req.uid, senderName, text, fileData);

      // --- 🚨 NOTIFICATION: Alert the BA of a new message 🚨 ---
      let baId = null;
      const reqSnap = await db.collection('requirements').where('reqId', '==', reqId).get();
      if (!reqSnap.empty) {
          baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
      } else {
          const docRef = await db.collection('requirements').doc(reqId).get();
          if (docRef.exists) baId = docRef.data().baId || docRef.data().claimedBy;
      }

      if (baId) {
          await sendNotification({
              recipientId: baId,
              title: "New Message from Client",
              message: `${senderName || "The client"} sent a message regarding project ${reqId}.`,
              type: "Communication",
              link: "/ba/communication"
          });
      }

      res.json({ success: true, data: newMsg });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markProjectMessagesRead = async (req, res) => {
  try {
      await CommunicationModel.markMessagesAsRead(req.params.reqId, req.uid);
      res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getMessages = async (req, res) => {
  try {
    const messages = await CommunicationModel.getMessages(req.uid);
    res.json({ success: true, data: messages });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendMessage = async (req, res) => {
  try {
    const docId = await CommunicationModel.sendMessage(req.body, req.uid);
    res.json({ success: true, id: docId });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getApprovals = async (req, res) => {
  try {
    const approvals = await RequirementModel.getApprovals(req.uid);
    res.json({ success: true, data: approvals });
  } catch (error) { res.status(500).json({ success: false }); }
};

const approveRequirement = async (req, res) => {
  try {
    const { id } = req.params; // React passes reqId here
    await RequirementModel.approveRequirement(id);

    // --- 🚨 NOTIFICATION: Find the BA and Alert Them 🚨 ---
    let baId = null;
    const reqSnap = await db.collection('requirements').where('reqId', '==', id).get();
    if (!reqSnap.empty) {
        baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
    } else {
        const docRef = await db.collection('requirements').doc(id).get();
        if (docRef.exists) baId = docRef.data().baId || docRef.data().claimedBy;
    }

    if (baId) {
        await sendNotification({
            recipientId: baId,
            title: "Project Approved!",
            message: `Great news! The client has officially approved requirement ${id}.`,
            type: "System",
            link: "/ba/dashboard"
        });
    }

    res.json({ success: true, message: "Requirement approved successfully" });
  } catch (error) {
    if (error.message === "Requirement not found") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false });
  }
};

const requestChangeForRequirement = async (req, res) => {
  try {
    const { id } = req.params; // React passes reqId here
    const { changeType, changeDescription } = req.body; 
    await RequirementModel.requestChange(id, changeType, changeDescription);

    // --- 🚨 NOTIFICATION: Find the BA and Alert Them 🚨 ---
    let baId = null;
    const reqSnap = await db.collection('requirements').where('reqId', '==', id).get();
    if (!reqSnap.empty) {
        baId = reqSnap.docs[0].data().baId || reqSnap.docs[0].data().claimedBy;
    } else {
        const docRef = await db.collection('requirements').doc(id).get();
        if (docRef.exists) baId = docRef.data().baId || docRef.data().claimedBy;
    }

    if (baId) {
        await sendNotification({
            recipientId: baId, 
            title: "Client Change Request",
            message: `The client requested a ${changeType} change for project ${id}.`,
            type: "Requirement",
            link: "/ba/changes"
        });
    }

    res.json({ success: true, message: "Change request submitted successfully" });
  } catch (error) {
    if (error.message === "Requirement not found") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false });
  }
};

const getArchivedRequirements = async (req, res) => {
  try {
    const archives = await RequirementModel.getArchivedRequirements(req.uid);
    res.json({ success: true, data: archives });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getSettings = async (req, res) => {
  try {
    const settings = await UserModel.getSettings(req.uid);
    res.json({ success: true, data: settings });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateGeneralSettings = async (req, res) => {
  try {
    await UserModel.updateGeneralSettings(req.uid, req.body);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateSecuritySettings = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: "No Password provided" });
    await UserModel.updateSecuritySettings(req.uid, newPassword);
    res.json({ success: true, message: "Password permanently updated in Firebase Auth" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    await UserModel.updateNotificationSettings(req.uid, key, value);
    res.json({ success: true, message: "Notifications updated successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getNotifications = async (req, res) => {
  try {
    const data = await UserModel.getNotifications(req.uid);
    res.json({ success: true, data: data.notifications, unreadCount: data.unreadCount });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markNotificationsRead = async (req, res) => {
  try {
    await UserModel.markNotificationsRead(req.uid);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = {
  requireUid,
  submitProject, getOverviewStats, getProjectProgress, getChangeRequests, 
  getActionItems, getRecentActivity, searchRequirements, getAllRequests,
  getClarifications, answerClarification, getApprovals, approveRequirement,
  requestChangeForRequirement, getArchivedRequirements,
  getSettings, updateGeneralSettings, updateSecuritySettings, updateNotificationSettings,
  getNotifications, markNotificationsRead,
  getChatProjects, getProjectMessages, sendProjectMessage, markProjectMessagesRead
};