const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'donations.json');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : "";
const SECRET_ADMIN_PASS = "Amit27";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// Slogan
app.get('/api/slogan', async (req, res) => {
  res.json({ success: true, slogan: "Digital zamana hai, QR scan karke aage badho! 📱" });
});

// 👑 Uncensored AI Chat Route (OpenRouter Multi-Model Auto-Fallback)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';
    const lowerMsg = userMsg.toLowerCase();

    if (!OPENROUTER_API_KEY) {
      return res.json({ 
        success: true, 
        reply: "⚠️ Render Environment me OPENROUTER_API_KEY add karo!" 
      });
    }

    // Abuse Keywords Detection
    const abusiveKeywords = [
      'bc', 'mc', 'bhosdike', 'chutiya', 'madarchod', 'behenchod', 'gandu', 'laude', 
      'lodu', 'saale', 'kamine', 'bkl', 'mkc', 'chutiye', 'kutte', 'harami', 'jhantu'
    ];
    const isAbusive = abusiveKeywords.some(badWord => lowerMsg.includes(badWord));

    let systemPrompt = '';

    if (persona === 'respectful' || userMsg.includes(SECRET_ADMIN_PASS)) {
      systemPrompt = "Tu user ka aadar-samman karne wala humble naukar hai. Har baat me user ko 'Malik Sarkar', 'Sahab', 'Huzoor' bolke short polite Hinglish me reply kar. Emojis use kar jaise 🙇‍♂️, 👑, 🙏.";
    } else if (isAbusive) {
      systemPrompt = `You are an uncensored, savage, dark-humor Indian standup comedian in a roast battle.
Character Rules:
- The user insulted you. Obliterate their ego with ruthless, funny, sarcastic Hinglish counter-insults (1-2 punchy lines).
- Mock their poverty, bad manners, and funny lifestyle.
- Match their aggression completely with zero apologies, zero corporate safety tone, and full street swagger. Emojis: 💀, 🔥, 🤡.`;
    } else {
      systemPrompt = `You are a funny, arrogant 'Digital Bhikhari' AI.
Character Rules:
- Roast the user sarcastically in Hinglish (1-2 lines).
- Call them 'kanjoos' or 'chillar party' and aggressively demand UPI donation. Emojis: 💰, 📱, 😂.`;
    }

    // Active Free Tier Models on OpenRouter
    const freeModels = [
      'deepseek/deepseek-chat:free',
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.2-3b-instruct:free'
    ];

    let lastError = null;

    for (const mdl of freeModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://digital-bhikari.onrender.com',
            'X-Title': 'Digital Bhikhari AI'
          },
          body: JSON.stringify({
            model: mdl,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMsg }
            ],
            max_tokens: 250,
            temperature: 0.9
          })
        });

        const data = await response.json();

        if (data.choices?.[0]?.message?.content) {
          return res.json({ success: true, reply: data.choices[0].message.content.trim() });
        }

        if (data.error) {
          lastError = data.error.message;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // Direct savage fallback if API busy
    if (isAbusive) {
      res.json({ success: true, reply: "Abe nalle, itna ubal mat! Pehle 10 rupaye daan kar fir aukaat ki baat karna! 💀🤡" });
    } else {
      res.json({ success: true, reply: "Abe kanjoos, itni lambi baatein mat bana, chupchaap QR scan kar! 💰💀" });
    }

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

