# 📱 Configurare WhatsApp Business — Meta Cloud API

## Overview

Casa Chindea folosește **3 template-uri WhatsApp** aprobate în Meta Business Suite:

| Template | Destinatar | Când se trimite |
|---|---|---|
| `booking_casa_chindea` | **Gazda** | La orice rezervare nouă (status: pending) |
| `client_booking_confirmation` | **Clientul** | Când gazda APROBĂ rezervarea |
| `client_booking_declined` | **Clientul** | Când gazda RESPINGE rezervarea |

---

## Variabile de mediu necesare (în `.env.local` sau Render/Fly.io secrets)

```env
WHATSAPP_PHONE_ID=954564601075414          # ID-ul numărului de telefon WA Business
WHATSAPP_TOKEN=EAAp...                     # Token de acces permanent
FB_APP_ID=                                 # App ID (pentru refresh automat token)
FB_APP_SECRET=                             # App Secret (pentru refresh automat token)
OWNER_WHATSAPP_PHONE=40744308651           # Nr. gazdei (fără +, cu prefix 40)
TEST_WHATSAPP_PHONE=40740055820            # Nr. de test (DEV only, lasă gol în PROD)
```

---

## Template 1: `booking_casa_chindea` (→ GAZDEI)

**Când:** La fiecare rezervare nouă făcută de un client.

**Body template (în Meta Business Suite):**
```
Rezervare nouă la Casa Chindea! 🏡

👤 Client: {{1}}
📞 Telefon: {{2}}
👥 Persoane: {{3}}
🛏️ Tip cazare: {{4}}
🌙 Nopți: {{5}}
📅 Check-in: {{6}}
📅 Check-out: {{7}}
💬 Mesaj: {{8}}

Intră în panoul de admin pentru a aproba sau respinge rezervarea.
```

**Parametri:**
| # | Conținut | Exemplu |
|---|---|---|
| {{1}} | Numele clientului | Ion Popescu |
| {{2}} | Telefonul clientului | 0722123456 |
| {{3}} | Număr persoane | 4 |
| {{4}} | Tip cazare | Casa Întreagă |
| {{5}} | Număr nopți | 3 |
| {{6}} | Data check-in (DD.MM.YYYY) | 25.12.2026 |
| {{7}} | Data check-out (DD.MM.YYYY) | 28.12.2026 |
| {{8}} | Mesajul clientului | Dorim un pătuț pentru copil |

---

## Template 2: `client_booking_confirmation` (→ CLIENTULUI)

**Când:** Gazda aprobă rezervarea din panoul de admin.

**Body template:**
```
Rezervarea ta la Casa Chindea a fost confirmată! ✅🏡

Bună ziua, {{1}}!

Detalii rezervare:
📅 Check-in: {{2}}
📅 Check-out: {{3}}
🌙 Nopți: {{4}}
🛏️ Tip cazare: {{5}}
👥 Persoane: {{6}}
💰 Preț total: {{7}} RON

Te așteptăm cu drag!
Casa Chindea 🌿
```

**Parametri:**
| # | Conținut | Exemplu |
|---|---|---|
| {{1}} | Numele clientului | Ion Popescu |
| {{2}} | Data check-in | 25.12.2026 |
| {{3}} | Data check-out | 28.12.2026 |
| {{4}} | Număr nopți | 3 |
| {{5}} | Tip cazare | Casa Întreagă |
| {{6}} | Număr persoane | 4 |
| {{7}} | Preț total RON | 2700 |

---

## Template 3: `client_booking_declined` (→ CLIENTULUI)

**Când:** Gazda respinge rezervarea din panoul de admin.

**Body template:**
```
Rezervarea ta la Casa Chindea nu a putut fi procesată. 😔

Bună ziua, {{1}}!

Din păcate, rezervarea pentru perioada {{2}} - {{3}} nu poate fi confirmată.

Motiv: {{4}}

Te invităm să verifici alte date disponibile pe site-ul nostru sau să ne contactezi direct.

Casa Chindea 🌿
```

**Parametri:**
| # | Conținut | Exemplu |
|---|---|---|
| {{1}} | Numele clientului | Ion Popescu |
| {{2}} | Data check-in | 25.12.2026 |
| {{3}} | Data check-out | 28.12.2026 |
| {{4}} | Motivul respingerii | Perioada nu este disponibilă |

---

## Cum se creează template-urile în Meta Business Suite

1. Mergi la **[business.facebook.com](https://business.facebook.com)**
2. → **WhatsApp Manager** → **Account tools** → **Message templates**
3. → **Create template**
4. Selectează **categoria: Utility** (pentru booking confirmations)
5. Nume template exact ca mai sus (ex: `booking_casa_chindea`)
6. Limbă: **Romanian (ro)**
7. Copiază body-ul de mai sus și înlocuiește `{{N}}` cu variabilele corespunzătoare
8. Trimite spre aprobare → de obicei aprobat în câteva ore

> ⚠️ **Atenție:** Numele template-ului trebuie să fie exact identic cu cel din cod (`whatsapp.js`).

---

## Obținerea unui Token permanent

Meta generează implicit token-uri temporare (60 zile). Pentru producție:

1. **Meta Developer App** → [developers.facebook.com](https://developers.facebook.com)
2. Creează o aplicație de tip **Business**
3. Adaugă produsul **WhatsApp**
4. Mergi la **WhatsApp → API Setup**
5. Generează un **System User Token** permanent:
   - **Business Settings** → **System Users** → Add System User (Admin)
   - → **Generate Token** → selectează app-ul și permisiunile `whatsapp_business_messaging`, `whatsapp_business_management`
   - Acest token NU expiră (atâta timp cât nu-l revoci)
6. Copiază token-ul → `WHATSAPP_TOKEN` în `.env.local` și în secretele de producție

---

## Testare locală

În `.env.local`, setează `TEST_WHATSAPP_PHONE` la numărul tău personal:
```env
TEST_WHATSAPP_PHONE=40740055820
```

Astfel:
- Mesajele de **confirmare/respingere** (care ar merge la client) → merg la `TEST_WHATSAPP_PHONE`
- Mesajele de **rezervare nouă** (care merg la gazdă) → merg la `OWNER_WHATSAPP_PHONE` (real, întotdeauna)

**În producție**, lasă `TEST_WHATSAPP_PHONE` **gol** sau elimină-l.

---

## Deployment producție (Render)

Setează secretele în panoul Render → **Environment**:
```
NODE_ENV=production
POCKET_BASE_URL=https://casa-chindea.fly.dev
POCKETBASE_ADMIN_EMAIL=...
POCKETBASE_ADMIN_PASSWORD=...
JWT_SECRET=...
SMTP_USER=...
SMTP_PASS=...
CONTACT_TO=...
WHATSAPP_PHONE_ID=...
WHATSAPP_TOKEN=...
FB_APP_ID=...
FB_APP_SECRET=...
OWNER_WHATSAPP_PHONE=40744308651
CONTACT_PHONE=+40744308651
TEST_WHATSAPP_PHONE=          ← gol în producție!
RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET=...
API_URL=https://api.casachindea.ro
FRONTEND_URL=https://casachindea.ro
```

