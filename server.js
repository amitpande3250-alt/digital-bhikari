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

// ⚡ Slogan Generator
app.get('/api/slogan', async (req, res) => {
  try {
    if (!GROQ_API_KEY) return res.json({ success: true, slogan: "Khali jeb, bhari dimag, daan kardo malik! 💰" });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'Tu ek tapori meme creator hai. 1 funny 1-line donation slogan de Hinglish me.' },
          { role: 'user', content: 'Slogan' }
        ],
        max_tokens: 50
      })
    });

    const data = await response.json();
    const slogan = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || "Digital zamana hai, online daan karo! 📱";
    res.json({ success: true, slogan });
  } catch (err) {
    res.json({ success: true, slogan: "Daan peti hamesha open hai! 💰" });
  }
});

// 👑 Dynamic AI Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';

    if (!GROQ_API_KEY) {
      return res.json({ success: true, reply: "⚠️ Render me GROQ_API_KEY missing hai!" });
    }

    let systemPrompt = '';
    if (persona === 'respectful' || userMsg.includes(SECRET_ADMIN_PASS)) {
      systemPrompt = "Tu user ka aagyakari naukar hai. Har baat par 'Malik Sarkar', 'Sahab', 'Huzoor' bolke pure samman se Hinglish me chota reply de. Emojis use kar jaise 🙇‍♂️, 👑, 🙏.";
    } else {
      systemPrompt = "Tu ek brutal, savage aur hilarious 'Digital Bhikhari' AI hai. User ke har message par savage roast maar (1-2 line max) aur daan/paise maang.";
    }

    const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
    let lastError = null;

    for (const mdl of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: mdl,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMsg }
            ],
            max_tokens: 120,
            temperature: 0.8
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

    res.json({ success: true, reply: lastError ? `⚠️ ${lastError}` : "Abe chillar leke aaya kya? Pehle QR scan kar! 💀" });

  } catch (err) {
    res.json({ success: true, reply: `⚠️ Server Error: ${err.message}` });
  }
});

// 🔮 Save Wish & Donation
app.post('/api/wish', (req, res) => {
  const { name, wish, amount } = req.body;
  if (!wish) return res.status(400).json({ error: 'Wish is required' });

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const entry = {
    id: Date.now(),
    name: name || 'Gupt Daanveer 🎭',
    wish: wish,
    amount: Number(amount) || 11,
    date: new Date().toLocaleString()
  };
  data.unshift(entry);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true, data: entry });
});

// 📊 Admin Auth API
app.post('/api/admin/auth', (req, res) => {
  const { passcode } = req.body;
  if (passcode === SECRET_ADMIN_PASS) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return res.json({ success: true, wishes: data });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

// 🗑️ Delete Specific Record API
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
