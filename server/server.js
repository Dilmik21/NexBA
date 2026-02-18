require('dotenv').config(); // Load the .env file immediately
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 5000;

// Middleware (Security & Data parsing)
app.use(cors());
app.use(express.json());

// Initialize OpenAI with your secure key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// A simple test route to see if the server works
app.get('/', (req, res) => {
    res.send('NexBA Server is Running! 🚀');
});

// ... existing code ...

// New Route: The Client will call this URL
app.post('/api/ai-test', async (req, res) => {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." },
                       { role: "user", content: "Write a haiku about a software engineer." }],
            model: "gpt-3.5-turbo",
        });

        // Send the AI's answer back to the Client
        res.json({ message: completion.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong with OpenAI." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});