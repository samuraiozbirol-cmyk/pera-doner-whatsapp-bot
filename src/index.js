
require("dotenv").config();

const express = require("express");
const app = express();
app.use(express.json());

const {
  PORT = 10000,
  VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  GRAPH_API_VERSION = "v25.0",
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

const money = (n) => `${n} TL`;

function menuText() {
  const groups = [
    ["DÖNER", ["1", "2", "3", "4", "5", "6", "7", "8", "9"]],
    ["CİĞER", ["10", "11", "12", "13", "14", "15"]],
    ["İÇECEKLER", ["16", "17", "18"]]
  ];

  const lines = ["🍽️ *PERA DÖNER MENÜSÜ*"];

  for (const [heading, ids] of groups) {
    lines.push("", `*${heading}*`);

    for (const id of ids) {
      const item = MENU[id];
      lines.push(`${id}. ${item.name} — ${money(item.price)}`);
    }
  }

  lines.push(
    "",
    "Sipariş için ürün numaralarını virgülle yazın. Örnek: 1, 16"
  );

  return lines.join("\n");
}

function welcome() {
  return "Merhaba! 👋 *Pera Döner* sipariş hattına hoş geldiniz.\n\nMenüyü görmek için *2*, sipariş vermek için *1* yazın.\nİptal etmek için istediğiniz zaman *iptal* yazabilirsiniz.";
}

async function sendText(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WHATSAPP_TOKEN veya PHONE_NUMBER_ID eksik.");
    return;
  }

  if (!to) {
    console.error("Mesaj alıcısı bulunamadı.");
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
      text: {
        preview_url: false,
        body
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      "WhatsApp API hata yanıtı:",
      JSON.stringify(data)
    );

    throw new Error(`WhatsApp API HTTP ${response.status}`);
  }

  console.log("WhatsApp mesajı gönderildi:", JSON.stringify(data));

  return data;
}

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      step: "home",
      items: []
    });
  }

  return sessions.get(from);
}

function summary(s) {
  return [
    "🧾 *SİPARİŞ ÖZETİ*",
    ...s.items.map(x => `• ${x.name} — ${money(x.price)}`),
    "",
    `*Toplam: ${money(s.total)}*`,
    `Ad Soyad: ${s.name}`,
    `Adres: ${s.address}`,
    `Ödeme: ${s.payment}`,
    `Not: ${s.notes}`,
    "",
    "Siparişi onaylıyor musunuz?",
    "1. Evet, siparişi ver",
    "2. Hayır, iptal et"
  ].join("\n");
}

async function handleMessage(from, text) {
  const input = String(text || "").trim();
  const lower = input.toLocaleLowerCase("tr-TR");

  if (/^(iptal|vazgeç|cancel)$/i.test(lower)) {
    sessions.delete(from);
    return "Sipariş işlemi iptal edildi. Yeni işlem için *Merhaba* yazabilirsiniz.";
  }

  if (/^(merhaba|selam|hi|hello|başla|start)$/i.test(lower)) {
    sessions.delete(from);
    return welcome();
  }

  const s = getSession(from);

  if (input === "2" || lower === "menü" || lower === "menu") {
    return menuText();
  }

  if (s.step === "home") {
    if (input === "1") {
      s.step = "items";
      return `${menuText()}\n\nAlmak istediğiniz ürünlerin numaralarını virgülle yazın.`;
    }

    return welcome();
  }

  if (s.step === "items") {
    const ids = input.split(/[,\s]+/).filter(Boolean);
    const selected = ids.map(id => MENU[id]).filter(Boolean);

    if (!ids.length || selected.length !== ids.length) {
      return "Geçerli ürün numaralarını yazın. Örnek: 1, 16";
    }

    s.items = selected.map(item => ({ ...item }));
    s.step = "name";

    return `Seçiminiz:\n${s.items.map(x => `• ${x.name} — ${money(x.price)}`).join("\n")}\n\nAdınızı ve soyadınızı yazar mısınız?`;
  }

  if (s.step === "name") {
    if (input.length < 2) {
      return "Lütfen adınızı ve soyadınızı yazın.";
    }

    s.name = input;
    s.step = "address";

    return "Teslimat adresinizi mahalle, cadde/sokak, bina ve daire numarasıyla birlikte yazar mısınız?\n\n📍 Şimdilik Sultangazi'ye teslimat yapıyoruz.";
  }

  if (s.step === "address") {
    if (input.length < 8) {
      return "Lütfen açık teslimat adresinizi biraz daha ayrıntılı yazın.";
    }

    s.address = input;
    s.step = "payment";

    return "Ödeme tercihiniz nedir?\n1. Kapıda nakit\n2. Kapıda kart";
  }

  if (s.step === "payment") {
    if (input === "1") {
      s.payment = "Kapıda nakit";
    } else if (input === "2") {
      s.payment = "Kapıda kart";
    } else {
      return "Lütfen 1 (Kapıda nakit) veya 2 (Kapıda kart) yazın.";
    }

    s.step = "notes";

    return "Siparişinizle ilgili bir notunuz var mı? Örneğin: acısız olsun, soğan olmasın.\nNot yoksa *yok* yazın.";
  }

  if (s.step === "notes") {
    s.notes = lower === "yok" ? "Yok" : input;
    s.total = s.items.reduce((sum, item) => sum + item.price, 0);
    s.step = "confirm";

    return summary(s);
  }

  if (s.step === "confirm") {
    if (input === "2") {
      sessions.delete(from);
      return "Siparişiniz iptal edildi. Yeni sipariş için *Merhaba* yazabilirsiniz.";
    }

    if (input !== "1") {
      return "Lütfen 1 (Onayla) veya 2 (İptal) yazın.";
    }

    const orderText = [
      "🔔 *YENİ PERA DÖNER SİPARİŞİ*",
      `Müşteri: ${s.name}`,
      `WhatsApp: ${from}`,
      ...s.items.map(x => `• ${x.name} — ${money(x.price)}`),
      `Toplam: ${money(s.total)}`,
      `Adres: ${s.address}`,
      `Ödeme: ${s.payment}`,
      `Not: ${s.notes}`
    ].join("\n");

    if (RESTAURANT_NOTIFY_NUMBER) {
      try {
        await sendText(RESTAURANT_NOTIFY_NUMBER, orderText);
      } catch (error) {
        console.error("Restoran bildirimi gönderilemedi:", error.message);
        console.log(orderText);
      }
    } else {
      console.warn("RESTAURANT_NOTIFY_NUMBER tanımlı değil.");
      console.log(orderText);
    }

    sessions.delete(from);

    return "🎉 Siparişiniz alındı! Pera Döner'e ulaştı. Hazırlık durumuyla ilgili size bilgi vereceğiz. Afiyet olsun!";
  }

  sessions.delete(from);
  return welcome();
}

app.get("/", (_req, res) => {
  res.status(200).send("Pera Döner WhatsApp bot is running.");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  console.log("Webhook isteği geldi.");

  res.sendStatus(200);

  try {
    for (const entry of (req.body.entry || [])) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        const messages = value.messages || [];

        for (const message of messages) {
          if (message.type !== "text") continue;

          const sender = message.from || message.from_user_id;
          const messageText = message.text?.body || "";

          console.log("Gelen mesaj:", JSON.stringify({
            sender,
            text: messageText,
            messageId: message.id,
            phoneNumberId: value.metadata?.phone_number_id
          }));

          if (!sender) {
            console.error(
              "Gönderen bilgisi bulunamadı:",
              JSON.stringify(message)
            );
            continue;
          }

          const answer = await handleMessage(sender, messageText);

          await sendText(sender, answer);
        }
      }
    }
  } catch (error) {
    console.error("Webhook işleme hatası:", error);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pera Döner bot ${PORT} portunda çalışıyor.`);
});
