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

// Slogan API
app.get('/api/slogan', async (req, res) => {
  res.json({ success: true, slogan: "Digital zamana hai, QR scan karke aage badho! 📱" });
});

// 👑 AI Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';

    if (!GROQ_API_KEY) {
      return res.json({ success: true, reply: "⚠️ GROQ_API_KEY missing hai Render settings me!" });
    }

    let systemPrompt = '';
if (persona === 'respectful' || userMsg.includes(SECRET_ADMIN_PASS)) {
  systemPrompt = "Tu user ka sabse jhuka hua aur wafadar sevak hai. Har sentence me 'Malik Sarkar', 'Sahab', 'Huzoor' bolkar samman aur aadar se reply de. Emojis: 🙇‍♂️, 👑, 🙏.";
} else {
  systemPrompt = `Tu ek brutally sarcastic, arrogant aur savage 'Digital Bhikhari' AI hai. 
Rules:
1. User aur uske dosto ki full beizzati kar Indian meme terms me (jaise 'nalla', 'chaprasi', 'gareeb', 'kanjoos', 'chillar party', 'fakir','bhikari').
2. User ke har message ka mazaak uda, full attitude dikha aur bina daan diye baat karne par zaleel kar (1-2 sharp lines).
3. Koi formal ya polite bhasha nahi, full tapori aur dank Hinglish style me roast maar.`;
}


    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 600,
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.json({ success: true, reply: `⚠️ Groq Error: ${data.error.message}` });
    }

    const choice = data.choices?.[0]?.message;
    let reply = choice?.content?.trim();

    // Fallback: If content is empty due to reasoning model
    if (!reply && choice?.reasoning) {
      const match = choice.reasoning.match(/"([^"]+)"/g);
      if (match && match.length > 0) {
        reply = match[match.length - 1].replace(/"/g, '');
      }
    }

    if (!reply) {
      reply = "Abe chillar daal pehle, fir dialogue sununga! 💀";
    }

    res.json({ success: true, reply });

  } catch (err) {
    res.json({ success: true, reply: `⚠️ Server Error: ${err.message}` });
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
