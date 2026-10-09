require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️  Telegram tokenlari topilmadi!');
}

app.post('/api/order', async (req, res) => {
    try {
        const { product, category, price, size, color, material, name, phone, note } = req.body;

        if (!name || !phone || !product) {
            return res.status(400).json({ 
                success: false, 
                error: "Ism, telefon va mahsulot majburiy" 
            });
        }

        const escapeMd = (text) => 
            String(text || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

        const message = [
            `🔥 *YANGI MEBEL BUYURTMASI!*`,
            ``,
            `🛍 *Mahsulot:* ${escapeMd(product)}`,
            `🗂 *Toifa:* ${escapeMd(category)}`,
            `💰 *Narx:* ${escapeMd(price)}`,
            ``,
            `📐 *O'lchami:* ${escapeMd(size)}`,
            `🎨 *Rangi:* ${escapeMd(color)}`,
            `🪵 *Materiali:* ${escapeMd(material)}`,
            ``,
            `━━━━━━━━━━━━━━━`,
            `👤 *Mijoz:* ${escapeMd(name)}`,
            `📞 *Telefon:* ${escapeMd(phone)}`,
            note ? `📝 *Izoh:* ${escapeMd(note)}` : ''
        ].filter(Boolean).join('\n');

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            }
        );

        const result = await telegramResponse.json();

        if (!result.ok) {
            console.error('Telegram xatosi:', result);
            return res.status(500).json({ 
                success: false, 
                error: "Telegram'ga yuborishda xatolik" 
            });
        }

        console.log('✅ Yangi buyurtma:', name);
        res.json({ success: true, message: "Buyurtma qabul qilindi" });

    } catch (error) {
        console.error('Server xatosi:', error);
        res.status(500).json({ 
            success: false, 
            error: "Serverda xatolik" 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT} portda ishga tushdi`);
});