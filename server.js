const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'donations.json');
const SECRET_ADMIN_PASS = "Amit27";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// ⚡ Dynamic Smart Slogans
const slogans = [
  "Khali jeb, bhari dimag, daan kardo malik! 💰",
  "Digital zamana hai, QR scan karke aage badho! 📱",
  "Chillar nahi, direct UPI chalega! 💸",
  "Dua milegi full speed me, bas ₹11 bhej do! 🤲",
  "Gareebi mitani hai toh scan karo, gyaan mat do! 😂"
];

app.get('/api/slogan', (req, res) => {
  const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];
  res.json({ success: true, slogan: randomSlogan });
});

// 👑 Smart Roast & Respect Engine (No external API needed)
const roastTemplates = [
  "Abe {msg} bolne se pet nahi bharta, pehle ₹10 UPI kar fir baat sununga! 💀",
  "Itna attitude kis baat ka hai re? Jeb me chillar nahi aur baatein Ambani wali! 😂",
  "Dimag ka dahi mat kar, chupchap QR scan kar ya kat le yahan se! 🚶‍♂️",
  "Aaye bade {msg} bolne wale, pehle wallet check kar apna! 💸",
  "Bhai tu baat aisi kar raha jaise Swiss bank me account ho tera! Kanjoos kahin ka! 🤡",
  "Tere jaise 50 dekhe hain subah se, gyaan free me aur daan zero! QR code dekh wahan! 🤦‍♂️"
];

const respectTemplates = [
  "Ji Malik Sarkar! 🙏 Aapka aadesh sar aankhon par. Hukum kijiye Huzoor, main aapka gulam hazir hoon! 🙇‍♂️👑",
  "Arre Sarkar! Aapke kadmo me toh jaan hazir hai. Maaf kijiye gustakhi, batayein kya seva karein? 🫡🙏",
  "Huzoor! Aapka har hukum mere liye aadesh hai. Jo kahein wahi hoga Malik! 👑🙇‍♂️",
  "Pranam Malik! Aap jaise daanveer ke samne hum toh bas chote se sewak hain. Hukum karein! 🤲👑"
];

app.post('/api/chat', (req, res) => {
  try {
    const { message, persona } = req.body;
    const userMsg = message ? message.trim() : 'Hi';
    const lower = userMsg.toLowerCase();

    // Respect Mode Trigger
    const isRespect = persona === 'respectful' || 
                      userMsg.includes(SECRET_ADMIN_PASS) || 
                      lower.includes('respect') || 
                      lower.includes('izzat') || 
                      lower.includes('sahab') || 
                      lower.includes('malik');

    let reply = "";
    if (isRespect) {
      reply = respectTemplates[Math.floor(Math.random() * respectTemplates.length)];
    } else {
      const template = roastTemplates[Math.floor(Math.random() * roastTemplates.length)];
      reply = template.replace('{msg}', userMsg);
    }

    res.json({ success: true, reply });
  } catch (err) {
    res.json({ success: true, reply: "Arre bhai direct ₹11 bhej de! 😂" });
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
