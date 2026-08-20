const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'donations.json');
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Key ab Render settings se ayegi

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Chat Route
app.post('/api/chat', async (req, res) => {
    try {
        const { message, persona } = req.body;
        
        // Agar key nahi mili toh error dikhaye
        if (!GROQ_API_KEY) return res.json({ reply: "API Key missing hai Render settings me!" });

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                // Yahan model name check karte rehna, Groq model update karta rehta hai
                model: 'llama-3.3-70b-versatile', 
                messages: [
                    { role: "system", content: "Tum ek savage roast master ho." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;
        res.json({ success: true, reply });
    } catch (err) {
        res.json({ success: false, reply: "Error aa raha hai, API check karo!" });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
