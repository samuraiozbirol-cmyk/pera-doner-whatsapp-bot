# Pera Döner WhatsApp Sipariş Botu

WhatsApp Cloud API için başlangıç botu. Müşteriyle yazışarak ürün seçer, ad/adres/ödeme/not alır ve sipariş özetini onaylatır.

## Güvenlik
- Gerçek erişim belirtecini GitHub'a yüklemeyin.
- Hosting ortam değişkenlerini kullanın.
- `.env` dosyası `.gitignore` içindedir.
- Bu başlangıç sürümünde sohbet oturumları bellekte tutulur; sunucu yeniden başlarsa açık sepetler sıfırlanır.
- `RESTAURANT_NOTIFY_NUMBER` boşsa restoran bildirimi gönderilmez; sipariş sunucu günlüğüne yazılır.

## Gerekli ortam değişkenleri
`PORT`, `VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `GRAPH_API_VERSION`, `RESTAURANT_NOTIFY_NUMBER`.

`GRAPH_API_VERSION` için Meta uygulamanızın desteklediği güncel Graph API sürümünü girin.

## Yerel çalıştırma
1. Node.js 20+ kurun.
2. `npm install`
3. `.env.example` dosyasını `.env` olarak kopyalayıp değerleri doldurun.
4. `npm start`

Webhook callback URL: `https://SUNUCU-ADRESINIZ/webhook`

Meta Webhooks bölümünde `messages` alanına abone olun.

## Menü
Menü ve fiyatlar `src/index.js` içindeki `MENU` nesnesindedir. Bu ilk sürümde ürünler tek tek sepete eklenir; miktar/ürün seçenekleri sonraki geliştirme adımıdır.
