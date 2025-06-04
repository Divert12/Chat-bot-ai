require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Check for required environment variables
if (!process.env.GROQ_API_KEY) {
    console.error('Error: GROQ_API_KEY environment variable is not set');
    console.error('Please set the GROQ_API_KEY environment variable in your .env file or in your deployment environment');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve chat.html for the /chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Chat endpoint
app.post('/api/chat', async(req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: [{
                    role: "user",
                    content: prompt
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Groq API Error:', data);
            if (response.status === 401) {
                return res.status(500).json({
                    error: 'Invalid API key. Please check your GROQ_API_KEY environment variable.'
                });
            }
            return res.status(500).json({
                error: data.error ? data.error.message : 'Error communicating with Groq API'
            });
        }

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        res.json({
            response: data.choices[0].message.content
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Internal server error. Please try again later.'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        apiKeyConfigured: !!process.env.GROQ_API_KEY
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API Key configured: ${process.env.GROQ_API_KEY ? 'Yes' : 'No'}`);
});