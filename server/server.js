require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const admin = require("firebase-admin");

// 1. Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================
// --- REAL DATABASE ROUTES ---
// ==========================================

// 1. AI WRITING ASSISTANT
app.post('/api/ai/structure-text', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: "Text is required" });

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Business Analyst assistant. Take the user's rough project idea and rewrite it into a clear, professional software requirement description." },
        { role: "user", content: rawText }
      ],
      model: "gpt-3.5-turbo",
    });

    res.json({ success: true, structuredText: completion.choices[0].message.content });
  } catch (error) {
    console.error("[OpenAI Error]:", error);
    res.status(500).json({ success: false });
  }
});

// 2. SUBMIT NEW PROJECT & LOG ACTIVITY (WITH AUTO-ID)
app.post('/api/client/projects', async (req, res) => {
  try {
    const projectData = req.body;

    console.log(`[Backend] Generating Custom Requirement ID...`);
    
    // Ask Firestore how many requirements exist to generate the next sequential number
    const snapshot = await db.collection('requirements').count().get();
    const currentCount = snapshot.data().count;
    
    const nextNumber = 1001 + currentCount;
    const customReqId = `REQ-${nextNumber}`; 
    
    console.log(`[Backend] Generated ID: ${customReqId}`);

    const newRequirement = {
      ...projectData,
      reqId: customReqId, // <-- Saving the custom ID
      status: "Pending BA Review",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0
    };

    console.log(`[Backend] Saving New Project to Firestore...`);
    const docRef = await db.collection('requirements').add(newRequirement);

    // AUTOMATIC ACTIVITY LOG
    await db.collection('activity_logs').add({
      user: "Dilmik", 
      action: `Launched new request: ${projectData.title}`,
      time: admin.firestore.FieldValue.serverTimestamp(),
      dotColor: "bg-blue-500", 
      reqId: customReqId // <-- Using the custom ID here too
    });

    res.json({ success: true, id: customReqId });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
});

// 3. GET REAL OVERVIEW STATS (Aggregated from Firebase)
app.get('/api/client/overview-stats', async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').get();
    
    let stats = {
      totalActive: 0,
      pendingApprovals: 0,
      inAnalysis: 0,
      clarificationsNeeded: 0
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.totalActive++; 
      if (data.status === "Pending Approval") stats.pendingApprovals++;
      if (data.status === "Pending BA Review" || data.status === "In Analysis") stats.inAnalysis++;
      if (data.status === "Clarification Needed") stats.clarificationsNeeded++;
    });

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. GET REAL PROJECT PROGRESS (Last 5 Items)
app.get('/api/client/project-progress', async (req, res) => {
  try {
    const snapshot = await db.collection('requirements')
                             .orderBy('submittedAt', 'desc')
                             .limit(5)
                             .get();

    let requirementsList = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      requirementsList.push({
        // Prioritize the new custom reqId, fallback to old random ID for older test data
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`, 
        title: data.title,
        stage: data.status,
        progress: data.progress || 0
      });
    });

    res.json({ 
      success: true, 
      data: { lastUpdated: "Live from Database", requirements: requirementsList }
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 5. GET REAL CHANGE REQUESTS
app.get('/api/client/change-requests', async (req, res) => {
  try {
    const snapshot = await db.collection('change_requests').where('status', '!=', 'Resolved').get();
    let requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      requests.push({
        id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
        title: `"${data.title || 'Untitled Update'}"`,
        type: data.type || "Scope Change",
        date: "Submitted recently",
        status: data.impactStatus || "Analyzing Impact...",
        statusColor: data.riskLevel === 'High' ? 'red' : 'yellow'
      });
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
});

// 6. GET REAL ACTION ITEMS (Approvals & Clarifications)
app.get('/api/client/action-items', async (req, res) => {
  try {
    const snapshot = await db.collection('requirements')
      .where('status', 'in', ['Pending Approval', 'Clarification Needed'])
      .get();
    
    let pendingApprovals = [];
    let clarificationsNeeded = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const reqId = data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`;

      if (data.status === "Pending Approval") {
        pendingApprovals.push({ id: reqId, title: data.title, meta: "Awaiting your review" });
      } else {
        clarificationsNeeded.push({ id: reqId, title: data.title, meta: "Question from BA", quote: data.clarificationQuestion || "Needs more details." });
      }
    });

    res.json({ success: true, data: { pendingApprovals, clarificationsNeeded } });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
});

// 7. GET REAL RECENT ACTIVITY
app.get('/api/client/recent-activity', async (req, res) => {
  try {
    const snapshot = await db.collection('activity_logs')
      .orderBy('time', 'desc')
      .limit(5)
      .get();

    let activities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: data.reqId || doc.id.substring(0, 6),
        action: data.action,
        time: "Recently", // You can format Firebase timestamps here later
        dotColor: data.dotColor || "bg-gray-400"
      });
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
});

// --- 8. GLOBAL SEARCH ROUTE ---
app.get('/api/client/search', async (req, res) => {
  try {
    // Get the search term from the URL (e.g., ?q=1004) and make it lowercase
    const searchQuery = req.query.q?.toLowerCase() || '';
    
    if (!searchQuery) {
      return res.json({ success: true, data: [] }); // Return empty if no search term
    }

    // Fetch all requirements
    const snapshot = await db.collection('requirements').get();
    let searchResults = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Safely get the ID and Title, converting to lowercase for easy searching
      const reqId = data.reqId ? data.reqId.toLowerCase() : `req-${doc.id.substring(0, 4).toLowerCase()}`;
      const title = data.title ? data.title.toLowerCase() : '';

      // THE SEARCH LOGIC: Does the ID or the Title contain the search term?
      if (reqId.includes(searchQuery) || title.includes(searchQuery)) {
        searchResults.push({
          id: data.reqId || `REQ-${doc.id.substring(0, 4).toUpperCase()}`,
          title: data.title,
          status: data.status
        });
      }
    });

    res.json({ success: true, data: searchResults });
  } catch (error) {
    console.error("[Backend Error]:", error);
    res.status(500).json({ success: false });
  }
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});