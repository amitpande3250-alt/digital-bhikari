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

// Helper to call Groq with auto-fallback models
async function getGroqCompletion(messages, max_tokens = 150) {
  const modelsToTry = [
    'llama-3.2-3b-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-1b-preview',
    'deepseek-r1-distill-llama-70b'
  ];

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: max_tokens,
          temperature: 0.85
        })
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
    } catch (e) {
      // Try next model
    }
  }
  return null;
}

// ⚡ Dynamic AI Slogan Generator Route
app.get('/api/slogan', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.json({ success: true, slogan: "Khali jeb, bhari dimag, daan kardo malik! 💰" });
    }

    const messages = [
      {
        role: 'system',
        content: 'Tu ek funny Indian meme master hai. "Digital Bhikhari" website ke liye ekdum creative, tapori, savage aur funny 1-line slogan bana (Hinglish me). Direct 1 line slogan de.'
      },
      { role: 'user', content: 'Ek funny slogan de.' }
    ];

    const reply = await getGroqCompletion(messages, 50);
    const slogan = reply ? reply.replace(/^["']|["']$/g, '') : "Digital zamana hai, online daan karo! 📱";
    res.json({ success: true, slogan });
  } catch (err) {
    res.json({ success: true, slogan: "Daan peti hamesha open hai! 💰" });
  }
});

// 👑 Dynamic AI Chat Route (Roast vs Respect Mode)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';

    if (!GROQ_API_KEY) {
      return res.json({ 
        success: true, 
        reply: "⚠️ Render me GROQ_API_KEY set nahi hai! Render dashboard me Environment variable check karo." 
      });
    }

    let systemPrompt = '';
    if (persona === 'respectful' || userMsg.includes(SECRET_ADMIN_PASS)) {
      systemPrompt = `Tu user ka sabse wafadar, aagyakari aur respectful naukar hai. User tera 'Malik', 'Huzoor' aur 'Sahab' hai.
Rules:
1. Har sentence me user ko 'Malik Sarkar', 'Sahab' ya 'Huzoor' bolkar behad aadar aur izzat se reply kar.
2. User ko bilkul roast mat kar, unke har aadesh ka palan kar.
3. Emojis use kar jaise 🙇‍♂️, 👑, 🙏, 🫡.`;
    } else {
      systemPrompt = `Tu ek savage, witty, brutally funny 'Digital Bhikhari' AI hai jo tapori Hinglish bolta hai.
Rules:
1. User ki baat sunkar use mast Savage roast maar (1-2 line max).
2. User ko 'kanjoos', 'bhikmange', 'gareeb' bolkar uski taang kheench.
3. Full attitude aur dank slang use kar. Polite bilkul mat ban.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg }
    ];

    const reply = await getGroqCompletion(messages, 150);

    if (reply) {
      res.json({ success: true, reply });
    } else {
      res.json({ 
        success: true, 
        reply: "Abe chillar leke aaya kya? Pehle QR scan kar fir baat kar! 💀" 
      });
    }
  } catch (err) {
    res.json({ success: true, reply: "Arre bhai server load le gaya, thoda daan daal ke server thanda kar! 😂" });
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
