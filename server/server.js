require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const clientRoutes = require('./routes/clientRoutes');
const sharedRoutes = require('./routes/sharedRoutes');

// Mount Routes
app.use('/api/client', clientRoutes);
app.use('/api/ai', sharedRoutes);

// Start Server
app.listen(port, () => {
    console.log(`🚀 Modular NexBA Server running on http://localhost:${port}`);
});