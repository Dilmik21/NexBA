const { admin, db } = require('../config/firebase');

class DeveloperTaskModel {
  static async getMyTasks(devId) {
    const snapshot = await db.collection('tasks').where('assigneeId', '==', devId).get();
    let tasks = { todo: [], inProgress: [], inReview: [], completed: [] };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const taskObj = { id: doc.id, ...data };
      
      if (data.status === "To Do") tasks.todo.push(taskObj);
      else if (data.status === "In Progress") tasks.inProgress.push(taskObj);
      else if (data.status === "In Review") tasks.inReview.push(taskObj);
      else if (data.status === "Completed") tasks.completed.push(taskObj);
    });
    return tasks;
  }

  static async updateTaskStatus(taskId, devId, newStatus) {
    // Security check: Only allow update if this dev owns the task
    const taskRef = db.collection('tasks').doc(taskId);
    const doc = await taskRef.get();
    
    if (!doc.exists || doc.data().assigneeId !== devId) {
      throw new Error("Unauthorized or Task Not Found");
    }

    await taskRef.update({ status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}

module.exports = { DeveloperTaskModel };