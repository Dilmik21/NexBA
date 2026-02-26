const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/structure-text', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: "Text is required" });

    // 1. THE GATEKEEPER PROMPT
    // We give the AI strict rules on what to accept and what to reject.
    const systemPrompt = `You are an expert Business Analyst assistant. Your job is to take a client's rough project idea and rewrite it into a clear, professional software requirement description.
    
    STRICT GUARDRAIL: First, analyze the user's text. Is it a valid idea for a software application, website, system, or digital feature? 
    - If the text is meaningless gibberish (e.g., "asdfgh"), a random statement (e.g., "I like cats"), or completely unrelated to software development, you MUST reject it.
    - To reject it, reply with EXACTLY this string and nothing else: "REJECTED_INPUT"
    
    If the text IS valid, output a professionally structured requirement. Use Markdown formatting with headings like 'Overview', 'Key Features', and 'Target Audience'.`;

    // 2. SEND TO OPENAI
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3, // Lower temperature makes the AI more strict and less creative/silly
    });

    const aiOutput = completion.choices[0].message.content.trim();

    // 3. THE BACKEND CHECK
    // If the AI decided the input was garbage, it will send back our secret code word.
    if (aiOutput === "REJECTED_INPUT") {
        console.log("[AI Warning] Client submitted meaningless text.");
        return res.json({ 
            success: false, 
            isInvalidInput: true, // We send this flag to the frontend
            error: "We could not process this. Please provide a meaningful description related to a software project or feature." 
        });
    }

    // 4. SUCCESS! Send the structured text back to the frontend
    res.json({ success: true, structuredText: aiOutput });

  } catch (error) {
    console.error("[OpenAI Error]:", error);
    res.status(500).json({ success: false, error: "Failed to connect to the AI engine." });
  }
});

module.exports = router;