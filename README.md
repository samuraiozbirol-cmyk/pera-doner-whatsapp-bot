# Pera Döner WhatsApp Sipariş Botu

WhatsApp Cloud API için başlangıç projesi.

## Güvenlik
- Gerçek WhatsApp erişim belirtecini GitHub'a yüklemeyin.
- Gerçek değerleri hosting servisinin Environment Variables alanına girin.
- `.env` dosyası `.gitignore` içindedir.
- Bu başlangıç sürümünde sepet oturumları bellekte tutulur; sunucu yeniden başlarsa devam eden sepetler sıfırlanır.
- `RESTAURANT_NOTIFY_NUMBER` tanımlanmadan restoran bildirimi gönderilmez.

## Gerekli ortam değişkenleri
`VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `GRAPH_API_VERSION`, `RESTAURANT_NOTIFY_NUMBER`.

`GRAPH_API_VERSION` için Meta uygulamanızın desteklediği Graph API sürümünü girin.

## Çalıştırma
Node.js 20+:
1. `npm install`
2. `.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun.
3. `npm start`

Meta webhook URL: `https://SUNUCU-ADRESINIZ/webhook`
Meta Webhooks bölümünde `messages` alanına abone olun.

## Menü
Ürünler ve fiyatlar `src/index.js` içindeki `MENU` nesnesindedir.
