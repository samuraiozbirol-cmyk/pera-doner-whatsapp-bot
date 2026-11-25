require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

const {
  PORT = 3000,
  VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  GRAPH_API_VERSION,
  RESTAURANT_NOTIFY_NUMBER
} = process.env;

const sessions = new Map();

const MENU = {
  "1": { name: "Yarım Döner", price: 100 },
  "2": { name: "Tombik Döner", price: 110 },
  "3": { name: "Normal Dürüm", price: 150 },
  "4": { name: "Kaşarlı Dürüm", price: 200 },
  "5": { name: "Tam Ekmek Döner", price: 200 },
  "6": { name: "Üç Parça Döner", price: 150 },
  "7": { name: "Porsiyon Döner", price: 250 },
  "8": { name: "P. Üstü Döner", price: 280 },
  "9": { name: "Zurna Dürüm", price: 300 },
  "10": { name: "Yarım Ciğer", price: 160 },
  "11": { name: "Tombik Ciğer", price: 170 },
  "12": { name: "Dürüm Ciğer", price: 240 },
  "13": { name: "Üç Çeyrek Ciğer", price: 260 },
  "14": { name: "Tam Ciğer", price: 320 },
  "15": { name: "Porsiyon Ciğer", price: 320 },
  "16": { name: "Ayran", price: 40 },
  "17": { name: "Cola", price: 70 },
  "18": { name: "Şalgam", price: 40 }
};

const money = n => `${n} TL`;
const menuText = () =>
  "🍽️ *PERA DÖNER MENÜSÜ*\\n\\n" +
  Object.entries(MENU).map(([key, item]) => `${key}. ${item.name} — ${money(item.price)}`).join("\\n") +
  "\\n\\nÜrün numarasını yazın. Birden fazla ürün için sırayla seçebilirsiniz.\\nSiparişi bitirmek için *0* yazın.";

async function sendText(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID || !GRAPH_API_VERSION || GRAPH_API_VERSION === "vXX.X") {
    console.log("WhatsApp API ayarları eksik; mesaj gönderilmedi:", { to, body });
    return;
  }
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("WhatsApp API hatası:", data);
    throw new Error("WhatsApp mesajı gönderilemedi");
  }
  return data;
}

function welcome() {
  return "Merhaba! 👋 *Pera Döner* sipariş hattına hoş geldiniz.\\n\\nSipariş vermek için *1*, menüyü görmek için *2* yazın.";
}

function getSession(from) {
  if (!sessions.has(from)) sessions.set(from, { step: "home", items: [] });
  return sessions.get(from);
}

async function handleMessage(from, text) {
  const input = (text || "").trim();
  const s = getSession(from);

  if (/^(iptal|vazgeç|cancel)$/i.test(input)) {
    sessions.delete(from);
    return "Sipariş işleminiz iptal edildi. Yeniden başlamak için *Merhaba* yazabilirsiniz.";
  }

  if (s.step === "home") {
    if (input === "1" || /merhaba|selam|başla|basla/i.test(input)) {
      s.step = "menu";
      return menuText();
    }
    if (input === "2" || /menü|menu/i.test(input)) return menuText();
    return welcome();
  }

  if (s.step === "menu") {
    if (input === "0") {
      if (!s.items.length) return "Henüz ürün seçmediniz. Ürün numarası yazın veya iptal etmek için *iptal* yazın.";
      s.step = "name";
      return "Siparişinizi aldım. Adınızı ve soyadınızı yazar mısınız?";
    }
    const item = MENU[input];
    if (!item) return "Geçerli bir ürün numarası yazın. Siparişi bitirmek için *0* yazın.";
    s.items.push(item);
    const total = s.items.reduce((sum, x) => sum + x.price, 0);
    return `✅ ${item.name} eklendi.\\nAra toplam: ${money(total)}\\n\\nBaşka ürün eklemek için numara yazın. Bitirmek için *0* yazın.`;
  }

  if (s.step === "name") {
    s.name = input;
    s.step = "address";
    return "Teslimat adresinizi mahalle, cadde/sokak, bina ve daire numarasıyla yazar mısınız? (Sultangazi)";
  }

  if (s.step === "address") {
    s.address = input;
    s.step = "payment";
    return "Ödeme tercihiniz nedir?\\n1. Kapıda nakit\\n2. Kapıda kart";
  }

  if (s.step === "payment") {
    if (!["1", "2"].includes(input)) return "Lütfen 1 (Kapıda nakit) veya 2 (Kapıda kart) yazın.";
    s.payment = input === "1" ? "Kapıda nakit" : "Kapıda kart";
    s.step = "notes";
    return "Sipariş notunuz var mı? Yoksa *yok* yazın.";
  }

  if (s.step === "notes") {
    s.notes = input.toLowerCase() === "yok" ? "Yok" : input;
    s.step = "confirm";
    s.total = s.items.reduce((sum, x) => sum + x.price, 0);
    return `🧾 *SİPARİŞ ÖZETİ*\\n${s.items.map(x => `• ${x.name} — ${money(x.price)}`).join("\\n")}\\n\\n*Toplam: ${money(s.total)}*\\nAd Soyad: ${s.name}\\nAdres: ${s.address}\\nÖdeme: ${s.payment}\\nNot: ${s.notes}\\n\\nOnaylıyor musunuz?\\n1. Evet, siparişi ver\\n2. Hayır, iptal et`;
  }

  if (s.step === "confirm") {
    if (input === "2") {
      sessions.delete(from);
      return "Siparişiniz iptal edildi. Yeni sipariş için *Merhaba* yazabilirsiniz.";
    }
    if (input !== "1") return "Lütfen 1 (Onayla) veya 2 (İptal) yazın.";
    const orderText = `🔔 *YENİ PERA DÖNER SİPARİŞİ*\\nMüşteri: ${s.name}\\nWhatsApp: ${from}\\n${s.items.map(x => `• ${x.name} — ${money(x.price)}`).join("\\n")}\\nToplam: ${money(s.total)}\\nAdres: ${s.address}\\nÖdeme: ${s.payment}\\nNot: ${s.notes}`;
    if (RESTAURANT_NOTIFY_NUMBER) {
      await sendText(RESTAURANT_NOTIFY_NUMBER, orderText);
    } else {
      console.warn("RESTAURANT_NOTIFY_NUMBER tanımlı değil; restoran bildirimi atlandı.");
      console.log(orderText);
    }
    sessions.delete(from);
    return "🎉 Siparişiniz alındı! Pera Döner'e ulaştı. Hazırlık durumuyla ilgili size bilgi vereceğiz. Afiyet olsun!";
  }

  sessions.delete(from);
  return welcome();
}

app.get("/", (_req, res) => res.status(200).send("Pera Döner WhatsApp bot is running."));
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    for (const entry of (req.body.entry || [])) {
      for (const change of (entry.changes || [])) {
        for (const message of (change.value?.messages || [])) {
          if (message.type !== "text") continue;
          const answer = await handleMessage(message.from, message.text?.body || "");
          await sendText(message.from, answer);
        }
      }
    }
  } catch (error) {
    console.error("Webhook işleme hatası:", error);
  }
});

app.listen(PORT, () => console.log(`Pera Döner bot ${PORT} portunda çalışıyor.`));
