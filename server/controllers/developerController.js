const { DeveloperTaskModel } = require('../models/DeveloperModels');

const requireDevId = (req, res, next) => {
  const devId = req.query.uid || req.body.uid;
  if (!devId) return res.status(401).json({ success: false, message: "Unauthorized Developer" });
  req.devId = devId;
  next();
};

const getMyTasks = async (req, res) => {
  try {
    const tasks = await DeveloperTaskModel.getMyTasks(req.devId);
    res.json({ success: true, data: tasks });
  } catch (error) { res.status(500).json({ success: false }); }
};

const updateTaskStatus = async (req, res) => {
  try {
    await DeveloperTaskModel.updateTaskStatus(req.params.id, req.devId, req.body.status);
    res.json({ success: true, message: "Status updated" });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { requireDevId, getMyTasks, updateTaskStatus };