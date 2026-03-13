require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());

// 👇 FIX: Increased limits to allow Base64 Profile Photo uploads (10 Megabytes) 👇
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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