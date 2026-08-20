const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'donations.json');
const GROQ_API_KEY = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : "";
const SECRET_ADMIN_PASS = "Amit27";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// 🤖 MAIN AI INTEGRATION ROUTE
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';

    console.log("Incoming Message:", userMsg);

    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY missing in environment variables!");
      return res.status(500).json({ success: false, reply: "⚠️ API Key not configured on server." });
    }

    // System Prompt Define
    let systemInstruction = "";
    if (persona === 'respectful' || userMsg.includes(SECRET_ADMIN_PASS)) {
      systemInstruction = "Tu user ka aadar-samman karne wala humble naukar hai. Har baat me user ko 'Malik', 'Huzoor', 'Sahab' bolke short polite Hinglish me reply kar. Emojis use kar jaise 🙇‍♂️, 👑, 🙏.";
    } else {
      systemInstruction = "Tu ek witty, brutal, sarcastic 'Digital Bhikhari' AI hai. User ki baat par short savage roast kar Hinglish me (1-2 lines) aur daan maang.";
    }

    // AI API Call
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    const data = await response.json();
    console.log("Groq Status:", response.status);

    if (data.error) {
      console.error("Groq API Error Detail:", data.error);
      return res.json({ success: true, reply: `⚠️ AI Error: ${data.error.message}` });
    }

    const aiReply = data.choices?.[0]?.message?.content?.trim();

    if (!aiReply) {
      console.warn("AI returned empty content. Full payload:", JSON.stringify(data));
      return res.json({ success: true, reply: "Abe thoda zor se bol, samajh nahi aaya! 💀" });
    }

    res.json({ success: true, reply: aiReply });

  } catch (err) {
    console.error("Server API Catch Error:", err);
    res.status(500).json({ success: false, reply: `⚠️ Server Error: ${err.message}` });
  }
});

// Donation & Admin Routes
app.post('/api/wish', (req, res) => {
  const { name, wish, amount } = req.body;
  if (!wish) return res.status(400).json({ error: 'Wish is required' });
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const entry = { id: Date.now(), name: name || 'Gupt Daanveer 🎭', wish, amount: Number(amount) || 11, date: new Date().toLocaleString() };
  data.unshift(entry);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true, data: entry });
});

app.post('/api/admin/auth', (req, res) => {
  const { passcode } = req.body;
  if (passcode === SECRET_ADMIN_PASS) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return res.json({ success: true, wishes: data });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/admin/delete-single', (req, res) => {
  const { passcode, id } = req.body;
  if (passcode === SECRET_ADMIN_PASS) {
    let data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    data = data.filter(item => item.id !== Number(id));
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
