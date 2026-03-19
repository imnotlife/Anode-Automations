require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Initialize OpenAI conditionally, depending on whether the key exists
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// System Prompt
const SYSTEM_PROMPT = `You are the AI assistant for Anode Automations.
Your job is to help visitors understand our automation services and recommend the correct plan.

Plans include:
Starter Automation (₹4,999)
Growth Automation (₹12,999)
Pro Automation (₹24,999)
Business Website Package (₹14,999)

Always explain benefits clearly and encourage users to book a consultation if they are interested.
Conversation style: friendly, professional, concise.`;

// Webhook endpoint for chatbot
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ reply: 'Message is required.' });
        }

        if (!process.env.OPENAI_API_KEY || !openai) {
            // Fallback if no API key is set for local testing
            console.warn("No OPENAI_API_KEY configured. Returning a mock response.");
            return res.json({
                reply: "Hello! I am currently running in mock mode. You can configure my OpenAI API key to enable full AI responses. How can I help you today?"
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 150,
        });

        const aiResponse = completion.choices[0].message.content;

        res.json({ reply: aiResponse });

    } catch (error) {
        console.error("OpenAI API Error:", error);
        res.status(500).json({ reply: "Sorry, I encountered an error processing your request. Please try again later." });
    }
});

// Fallback route to serve index.html for any remaining requests (useful if adding routing later)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
