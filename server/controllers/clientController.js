// --- IMPORTING OUR NEW MODELS ---
const { RequirementModel, CommunicationModel, UserModel } = require('../models/ClientModels');

// --- 1. SUBMIT NEW PROJECT ---
const submitProject = async (req, res) => {
  try {
    const uid = req.body.uid || req.query.uid; 
    const customReqId = await RequirementModel.submitProject(req.body, uid);
    res.json({ success: true, id: customReqId });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
};

// --- 2. OVERVIEW STATS ---
const getOverviewStats = async (req, res) => {
  try {
    const stats = await RequirementModel.getOverviewStats();
    res.json({ success: true, stats });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 3. PROJECT PROGRESS ---
const getProjectProgress = async (req, res) => {
  try {
    const requirementsList = await RequirementModel.getProjectProgress();
    res.json({ success: true, data: { lastUpdated: "Live from Database", requirements: requirementsList } });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 4. CHANGE REQUESTS ---
const getChangeRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getChangeRequests();
    res.json({ success: true, data: requests });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 5. ACTION ITEMS ---
const getActionItems = async (req, res) => {
  try {
    const items = await RequirementModel.getActionItems();
    res.json({ success: true, data: items });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 6. RECENT ACTIVITY ---
const getRecentActivity = async (req, res) => {
  try {
    const activities = await RequirementModel.getRecentActivity();
    res.json({ success: true, data: activities });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- 7. SEARCH ---
const searchRequirements = async (req, res) => {
  try {
    const searchQuery = req.query.q?.toLowerCase() || '';
    if (!searchQuery) return res.json({ success: true, data: [] });
    const searchResults = await RequirementModel.searchRequirements(searchQuery);
    res.json({ success: true, data: searchResults });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- GET ALL REQUESTS FOR THE TABLE ---
const getAllRequests = async (req, res) => {
  try {
    const requests = await RequirementModel.getAllRequests();
    res.json({ success: true, data: requests });
  } catch (error) { res.status(500).json({ success: false }); }
};

// ============================================================================
// --- CLARIFICATIONS ---
// ============================================================================

const getClarifications = async (req, res) => {
  try {
    const clarifications = await CommunicationModel.getClarifications();
    res.json({ success: true, data: clarifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

const answerClarification = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, fileName, fileData } = req.body;
    await CommunicationModel.answerClarification(id, answer, fileName, fileData);
    res.json({ success: true, message: "Answer submitted successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- APPROVALS ---
const getApprovals = async (req, res) => {
  try {
    const approvals = await RequirementModel.getApprovals();
    res.json({ success: true, data: approvals });
  } catch (error) { res.status(500).json({ success: false }); }
};

const approveRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    await RequirementModel.approveRequirement(id);
    res.json({ success: true, message: "Requirement approved successfully" });
  } catch (error) {
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
    if (error.message === "Requirement not found") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false });
  }
};

// --- MESSAGES ---
const getMessages = async (req, res) => {
  try {
    const messages = await CommunicationModel.getMessages();
    res.json({ success: true, data: messages });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendMessage = async (req, res) => {
  try {
    const docId = await CommunicationModel.sendMessage(req.body);
    res.json({ success: true, id: docId });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- ARCHIVE ---
const getArchivedRequirements = async (req, res) => {
  try {
    const archives = await RequirementModel.getArchivedRequirements();
    res.json({ success: true, data: archives });
  } catch (error) { res.status(500).json({ success: false }); }
};

// --- SETTINGS ---
const getSettings = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });
    const settings = await UserModel.getSettings(uid);
    res.json({ success: true, data: settings });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });
    await UserModel.updateGeneralSettings(uid, req.body);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateSecuritySettings = async (req, res) => {
  try {
    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) return res.status(400).json({ success: false, message: "No UID or Password provided" });
    await UserModel.updateSecuritySettings(uid, newPassword);
    res.json({ success: true, message: "Password permanently updated in Firebase Auth" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { uid, key, value } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });
    await UserModel.updateNotificationSettings(uid, key, value);
    res.json({ success: true, message: "Notifications updated successfully" });
  } catch (error) { res.status(500).json({ success: false }); }
};

// ============================================================================
// --- NOTIFICATION ENDPOINTS ---
// ============================================================================

const getNotifications = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "No UID provided" });
    const { notifications, unreadCount } = await UserModel.getNotifications(uid);
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markNotificationsRead = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ success: false });
    await UserModel.markNotificationsRead(uid);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = {
  submitProject, getOverviewStats, getProjectProgress, getChangeRequests, 
  getActionItems, getRecentActivity, searchRequirements, getAllRequests,
  getClarifications, answerClarification, getApprovals, approveRequirement,
  requestChangeForRequirement, getMessages, sendMessage, getArchivedRequirements,
  getSettings, updateGeneralSettings, updateSecuritySettings, updateNotificationSettings,
  getNotifications, markNotificationsRead
};