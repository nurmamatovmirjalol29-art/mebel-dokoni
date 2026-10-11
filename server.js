require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Telegram tokenlari
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️  Telegram tokenlari topilmadi!');
    console.warn('   .env faylini yoki Render Environment Variables ni tekshiring');
} else {
    console.log('✅ Telegram tokenlari yuklandi');
}

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================
function escapeMd(text) {
    return String(text || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatUzPhone(phone) {
    // +998 90 123 45 67 formatiga keltirish
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('998')) {
        return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
    }
    return phone;
}

// ============================================
// API: BUYURTMA YUBORISH
// ============================================
app.post('/api/order', async (req, res) => {
    try {
        const { 
            product, 
            category, 
            price, 
            priceType,   // "custom" yoki "approx"
            size, 
            color, 
            material, 
            name, 
            phone, 
            note 
        } = req.body;

        // Validatsiya
        if (!name || !phone || !product) {
            return res.status(400).json({ 
                success: false, 
                error: "Ism, telefon va mahsulot majburiy" 
            });
        }

        if (name.length < 2) {
            return res.status(400).json({ 
                success: false, 
                error: "Ism juda qisqa" 
            });
        }

        const phoneRegex = /^[+0-9\s\-\(\)]{9,20}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                error: "Telefon raqam formati xato" 
            });
        }

        // ⭐ NARX TURIGA QARAB XABAR
        let priceLine;
        if (priceType === 'custom') {
            priceLine = [
                `💰 *Narx:* ⚠️ Aloqada aniqlanadi`,
                `📞 _Maxsus o'lcham — menejer siz bilan bog'lanadi_`
            ].join('\n');
        } else {
            priceLine = [
                `💰 *Narx:* ${escapeMd(price)}`,
                `📏 _Taxminiy — aniq narx o'lchovdan keyin tasdiqlanadi_`
            ].join('\n');
        }

        // Telegram xabar matni
        const message = [
            `🔥 *YANGI MEBEL BUYURTMASI!*`,
            `━━━━━━━━━━━━━━━`,
            ``,
            `🛍 *Mahsulot:* ${escapeMd(product)}`,
            `🗂 *Toifa:* ${escapeMd(category)}`,
            priceLine,
            ``,
            `📐 *O'lchami:* ${escapeMd(size)}`,
            `🎨 *Rangi:* ${escapeMd(color)}`,
            `🪵 *Materiali:* ${escapeMd(material)}`,
            ``,
            `━━━━━━━━━━━━━━━`,
            ``,
            `👤 *Mijoz:* ${escapeMd(name)}`,
            `📞 *Telefon:* ${escapeMd(formatUzPhone(phone))}`,
            note ? `📝 *Izoh:* ${escapeMd(note)}` : '',
            ``,
            `⏰ *Vaqt:* ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`
        ].filter(Boolean).join('\n');

        // Telegram'ga yuborish
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
            console.error('❌ Telegram xatosi:', result);
            return res.status(500).json({ 
                success: false, 
                error: "Telegram'ga yuborishda xatolik" 
            });
        }

        console.log('✅ Yangi buyurtma:', name, '|', product);
        res.json({ success: true, message: "Buyurtma qabul qilindi" });

    } catch (error) {
        console.error('❌ Server xatosi:', error);
        res.status(500).json({ 
            success: false, 
            error: "Serverda xatolik" 
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    });
});

// ============================================
// BARCHA BOSHQA SO'ROVLAR → index.html
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// SERVERNI ISHGA TUSHIRISH
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT} portda ishga tushdi`);
    console.log(`📱 Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ Sozlangan' : '❌ Sozlanmagan'}`);
    console.log(`🌍 http://localhost:${PORT}`);
});
