// --- IMPORTING OUR MODELS ---
const { RequirementModel, CommunicationModel, UserModel } = require('../models/ClientModels');

/**
 * --- SECURITY MIDDLEWARE ---
 * Updated to strictly look for 'uid' to match Firebase and Model fields.
 */
const requireUid = (req, res, next) => {
  // Check headers (best practice), query params, or body
  const uid = req.headers['x-user-uid'] || req.query.uid || req.body.uid;
  
  if (!uid) {
    console.error("❌ [Auth Error]: Request rejected - No UID found");
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized: Missing user identity." 
    });
  }
  
  req.uid = uid; // Attach to request object
  next();
};

// --- 1. SUBMIT NEW PROJECT ---
const submitProject = async (req, res) => {
  try {
    const customReqId = await RequirementModel.submitProject(req.body, req.uid);
    res.json({ success: true, id: customReqId });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. OVERVIEW STATS ---
const getOverviewStats = async (req, res) => {
  try {
    const stats = await RequirementModel.getOverviewStats(req.uid);
    res.json({ success: true, stats });
  } catch (error) { 
    console.error("Stats Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- 3. PROJECT PROGRESS ---
const getProjectProgress = async (req, res) => {
  try {
    const requirementsList = await RequirementModel.getProjectProgress(req.uid);
    res.json({ 
      success: true, 
      data: { lastUpdated: new Date().toLocaleTimeString(), requirements: requirementsList } 
    });
  } catch (error) { 
    console.error("Progress Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- 4. CHANGE REQUESTS ---
const getChangeRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getChangeRequests(req.uid);
    res.json({ success: true, data: requests });
  } catch (error) { 
    console.error("Change Request Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- 5. ACTION ITEMS ---
const getActionItems = async (req, res) => {
  try {
    const items = await RequirementModel.getActionItems(req.uid);
    res.json({ success: true, data: items });
  } catch (error) { 
    console.error("Action Items Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- 6. RECENT ACTIVITY ---
const getRecentActivity = async (req, res) => {
  try {
    const activities = await RequirementModel.getRecentActivity(req.uid);
    res.json({ success: true, data: activities });
  } catch (error) { 
    console.error("Activity Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- 7. SEARCH ---
const searchRequirements = async (req, res) => {
  try {
    const searchQuery = req.query.q?.toLowerCase() || '';
    if (!searchQuery) return res.json({ success: true, data: [] });
    const searchResults = await RequirementModel.searchRequirements(searchQuery, req.uid);
    res.json({ success: true, data: searchResults });
  } catch (error) { 
    console.error("Search Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// --- GET ALL REQUESTS FOR THE TABLE ---
const getAllRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getAllRequests(req.uid);
    res.json({ success: true, data: requests });
  } catch (error) { 
    console.error("Get All Requests Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// ============================================================================
// --- CLARIFICATIONS ---
// ============================================================================

const getClarifications = async (req, res) => {
  try {
    const clarifications = await CommunicationModel.getClarifications(req.uid);
    res.json({ success: true, data: clarifications });
  } catch (error) { 
    console.error("Clarifications Error:", error);
    res.status(500).json({ success: false }); 
  }
};

const answerClarification = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, fileName, fileData } = req.body;
    await CommunicationModel.answerClarification(id, answer, fileName, fileData);
    res.json({ success: true, message: "Answer submitted successfully" });
  } catch (error) { 
    console.error("Answer Clarification Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// ============================================================================
// --- COMMUNICATION HUB (ADVANCED CHAT) ---
// ============================================================================

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
      const newMsg = await CommunicationModel.sendMessage(req.params.reqId, req.uid, senderName, text, fileData);
      res.json({ success: true, data: newMsg });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markProjectMessagesRead = async (req, res) => {
  try {
      await CommunicationModel.markMessagesAsRead(req.params.reqId, req.uid);
      res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- LEGACY MESSAGES (Kept for compatibility) ---
const getMessages = async (req, res) => {
  try {
    const messages = await CommunicationModel.getMessages(req.uid);
    res.json({ success: true, data: messages });
  } catch (error) { 
    console.error("Get Messages Error:", error);
    res.status(500).json({ success: false }); 
  }
};

const sendMessage = async (req, res) => {
  try {
    const docId = await CommunicationModel.sendMessage(req.body, req.uid);
    res.json({ success: true, id: docId });
  } catch (error) { 
    console.error("Send Message Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// ============================================================================
// --- APPROVALS & ARCHIVE ---
// ============================================================================

const getApprovals = async (req, res) => {
  try {
    const approvals = await RequirementModel.getApprovals(req.uid);
    res.json({ success: true, data: approvals });
  } catch (error) { 
    console.error("Approvals Error:", error);
    res.status(500).json({ success: false }); 
  }
};

const approveRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    await RequirementModel.approveRequirement(id);
    res.json({ success: true, message: "Requirement approved successfully" });
  } catch (error) {
    console.error("Approve Error:", error);
    if (error.message === "Requirement not found") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false });
  }
};

const requestChangeForRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, changeDescription } = req.body;
    await RequirementModel.requestChange(id, changeType, changeDescription);
    res.json({ success: true, message: "Change request submitted successfully" });
  } catch (error) {
    console.error("Request Change Error:", error);
    if (error.message === "Requirement not found") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false });
  }
};

const getArchivedRequirements = async (req, res) => {
  try {
    const archives = await RequirementModel.getArchivedRequirements(req.uid);
    res.json({ success: true, data: archives });
  } catch (error) { 
    console.error("Archive Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// ============================================================================
// --- SETTINGS ---
// ============================================================================

const getSettings = async (req, res) => {
  try {
    const settings = await UserModel.getSettings(req.uid);
    res.json({ success: true, data: settings });
  } catch (error) { 
    console.error("Get Settings Error:", error);
    res.status(500).json({ success: false }); 
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    await UserModel.updateGeneralSettings(req.uid, req.body);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) { 
    console.error("Update General Settings Error:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

const updateSecuritySettings = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: "No Password provided" });
    await UserModel.updateSecuritySettings(req.uid, newPassword);
    res.json({ success: true, message: "Password permanently updated in Firebase Auth" });
  } catch (error) { 
    console.error("Update Security Error:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    await UserModel.updateNotificationSettings(req.uid, key, value);
    res.json({ success: true, message: "Notifications updated successfully" });
  } catch (error) { 
    console.error("Update Notification Error:", error);
    res.status(500).json({ success: false }); 
  }
};

// ============================================================================
// --- NOTIFICATIONS ---
// ============================================================================

const getNotifications = async (req, res) => {
  try {
    const data = await UserModel.getNotifications(req.uid);
    res.json({ success: true, data: data.notifications, unreadCount: data.unreadCount });
  } catch (error) { 
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false }); 
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    await UserModel.markNotificationsRead(req.uid);
    res.json({ success: true });
  } catch (error) { 
    console.error("Mark Read Error:", error);
    res.status(500).json({ success: false }); 
  }
};

module.exports = {
  requireUid,
  submitProject, getOverviewStats, getProjectProgress, getChangeRequests, 
  getActionItems, getRecentActivity, searchRequirements, getAllRequests,
  getClarifications, answerClarification, getApprovals, approveRequirement,
  requestChangeForRequirement, getArchivedRequirements,
  getSettings, updateGeneralSettings, updateSecuritySettings, updateNotificationSettings,
  getNotifications, markNotificationsRead,
  getChatProjects, getProjectMessages, sendProjectMessage, markProjectMessagesRead // <-- New Hub functions exported
};