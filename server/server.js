require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());

// --- CRITICAL FIX: Increased limits to 50MB to allow large file attachments ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import Routes
const clientRoutes = require('./routes/clientRoutes');
const sharedRoutes = require('./routes/sharedRoutes');
const baRoutes = require('./routes/baRoutes'); 
const devRoutes = require('./routes/devRoutes'); // <-- NEW: Imported Developer Routes

// Mount Routes
app.use('/api/client', clientRoutes);
app.use('/api/ai', sharedRoutes);
app.use('/api/ba', baRoutes); 
app.use('/api/dev', devRoutes); // <-- NEW: Mounted Developer Routes

// Start Server
app.listen(port, () => {
    console.log(`🚀 Modular NexBA Server running on http://localhost:${port}`);
});