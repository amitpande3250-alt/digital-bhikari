const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'donations.json');
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// ⚡ AI Chat Route with Dynamic Persona Switching
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message || 'Hi';
    
    // Dynamic System Prompts
    let systemPrompt = '';
    
    if (persona === 'respectful') {
      systemPrompt = `Tu user ka wafadar, adheen aur respectful personal naukar hai. User tera 'Malik', 'Sahab' ya 'Sarkar' hai. 
      Rules: Har baat me respect dikha, roast bilkul mat kar, aur 'huzoor', 'sahab' jaise shabd use kar. Emojis: 🙇‍♂️, 👑, 🙏.`;
    } else {
      systemPrompt = `Tu ek savage, witty aur brutally funny 'Digital Bhikhari' AI hai jo tapori Hinglish bolta hai. 
      Rules: User ki taang khincho, unhe 'kanjoos', 'bhikhari' ya 'gareeb' bolkar roast karo. Attitude dikhao, bilkul polite mat bano.`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 150,
        temperature: 0.9
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Arre bhai, kuch dhang ka bolo! 😂";
    
    res.json({ success: true, reply });
  } catch (err) {
    res.json({ success: true, reply: "Network chala gaya, AI thoda gusse me hai!" });
  }
});

app.post('/api/donate', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  data.unshift({ ...req.body, id: Date.now(), date: new Date().toLocaleString() });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
