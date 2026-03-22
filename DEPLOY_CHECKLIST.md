# 🏡 Casa Chindea — Checklist Testare & Deploy Producție

> **Arhitectură:** Frontend → Vercel | Backend (Node.js/Express) → Render | PocketBase → Fly.io

---

## 📋 CUPRINS

1. [Testare locală înainte de deploy](#1-testare-locală-înainte-de-deploy)
2. [Pregătire credențiale producție](#2-pregătire-credențiale-producție)
3. [Deploy PocketBase pe Fly.io](#3-deploy-pocketbase-pe-flyio)
4. [Deploy Backend pe Render](#4-deploy-backend-pe-render)
5. [Deploy Frontend pe Vercel](#5-deploy-frontend-pe-vercel)
6. [Configurare Stripe Webhooks](#6-configurare-stripe-webhooks)
7. [Configurare WhatsApp Business](#7-configurare-whatsapp-business)
8. [Testare end-to-end în producție](#8-testare-end-to-end-în-producție)
9. [Checklist final înainte de lansare](#9-checklist-final-înainte-de-lansare)

---

## 1. Testare locală înainte de deploy

Rulează **toate** testele de mai jos local înainte să faci deploy. Dacă ceva eșuează local, va eșua și în producție.

### 1.1 Pornire servicii locale

```bash
# Pornește PocketBase + Backend + Frontend
bash start.sh

# Verifică că rulează:
# PocketBase:  http://127.0.0.1:8090/_/
# Backend:     http://localhost:3001/api/health
# Frontend:    http://localhost:8080
```

### 1.2 ✅ Autentificare & Cont

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Înregistrare cont nou | Register cu email nou | Email cu cod 6 cifre primit |
| Cod verificare | Introdu codul primit | Cont creat, `verified: true` în PocketBase |
| Cont duplicat | Încearcă register cu același email | Eroare clară "email deja folosit" |
| Login | Email + parolă corecte | Token JWT în sessionStorage |
| Login greșit | Parolă incorectă | Eroare "email sau parolă incorectă" |
| Logout | Click logout | sessionStorage șters, redirect la home |
| Profil | Actualizează nume/avatar | Salvat în PocketBase |

### 1.3 ✅ Rezervări (fără plată)

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Rezervare neautentificat | Submit form fără login | Modal "autentificare necesară" |
| Rezervare cameră | Completează form, submit | Modal plată sau succes direct |
| Rezervare casă întreagă | roomType=entire | Calculează prețul corect |
| Rezervare cu ofertă | Din offers.html, click "Rezervă" | Datele ofertei precompletate |
| Conflict date | Alege date deja ocupate | Eroare "datele sunt ocupate" |
| Calendar vizual | Deschide flatpickr | Datele ocupate marcate cu roșu |

### 1.4 ✅ Plată (Stripe TEST mode)

> ⚠️ Folosește carduri de test Stripe: `4242 4242 4242 4242`, exp: orice dată viitoare, CVC: orice 3 cifre

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Config plată | `GET /api/payment/config` | `paymentMode` != "none", `publishableKey` prezent |
| Modal plată apare | Submit rezervare cu paymentMode activ | Modal cu opțiuni Card/Cash |
| Buton X (închide) | Click X în modal | Modal se închide, rezervare NU salvată |
| Plată card full | Alege card, introdu 4242... | `paymentStatus: paid`, `status: confirmed` |
| Plată avans (deposit) | paymentMode=deposit în admin | Doar % din total e debitat |
| Plată cash | Alege cash în modal | `paymentMethod: cash`, status rămâne pending |
| Card invalid | Introdu 4000 0000 0000 0002 | Eroare afișată în modal |
| Câmpuri separate card | Click "Plătesc cu cardul" | 3 câmpuri separate: număr, exp, CVC |

### 1.5 ✅ Admin Dashboard

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Acces admin | Login cu cont admin | Tab-ul Admin vizibil |
| Acces non-admin | Login cont normal | Nu vede admin panel |
| Lista rezervări | Tab Rezervări | Rezervările apar cu badge plată |
| Confirmare rezervare | Click "Confirmă" pe o rezervare | Status → confirmed, WA trimis |
| Anulare rezervare | Click "Anulează" | Status → cancelled |
| Rezervare card | Rezervare plătită cu card | Nu apare buton "Confirmă" (auto-confirmat) |
| Salvare prețuri | Modifică prețuri, Save | Prețurile salvate, cache invalidat |
| Setări plată | Schimbă paymentMode în admin | booking.html reflectă imediat |
| Avans % | paymentMode=deposit, 30% | Clientul plătește 30% cu cardul |
| Oferte CMS | Adaugă/editează ofertă | Apare în offers.html |
| Fotografii ofertă | Upload imagine nouă la editare | Imaginea se schimbă după save |
| Galerie | Upload foto | Apare în gallery.html |
| Conținut CMS | Editează texte about/home | Se actualizează imediat |

### 1.6 ✅ Contact

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Formular contact | Completează toate câmpurile | Email primit cu subject "🏡 Casa Chindea | Mesaj nou:..." |
| Câmpuri lipsă | Submit fără mesaj | Eroare validare |
| Spam protection | Trimite 4+ mesaje rapid | Blocat după 3 în 5 minute |
| reCAPTCHA | Funcționează în browser | Nu blochează useri reali |

### 1.7 ✅ WhatsApp Notificări

| Test | Pași | Rezultat așteptat |
|------|------|-------------------|
| Rezervare nouă | Submit rezervare | WA pe `TEST_WHATSAPP_PHONE` (dev) |
| Confirmare rezervare | Admin confirmă rezervare | WA de confirmare trimis |
| Plată card | Plată Stripe reușită | WA confirmare plată trimis |

---

## 2. Pregătire credențiale producție

### 2.1 Generează JWT Secret puternic

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copiază rezultatul — va fi JWT_SECRET în producție
```

### 2.2 Stripe — chei LIVE

1. Mergi la [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Toggle → **Live mode**
3. Copiază:
   - `pk_live_...` → `STRIPE_PUBLISHABLE_KEY`
   - `sk_live_...` → `STRIPE_SECRET_KEY`

### 2.3 Gmail App Password

1. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crează "Casa Chindea Mail"
3. Copiază parola de 16 caractere → `SMTP_PASS`

### 2.4 reCAPTCHA

- Site key: `6LdPSWgsAAAAAAJn5PdzMIHalB6weUAoSU_1GH_r` (deja în cod)
- Secret: din `.env` → `RECAPTCHA_SECRET`
- ⚠️ Adaugă domeniul de producție în [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)

---

## 3. Deploy PocketBase pe Fly.io

### 3.1 Aplică migrările pentru plată

**ÎNAINTE de deploy**, adaugă câmpurile în PocketBase Admin UI (`http://127.0.0.1:8090/_/`):

**Collection `booking`** — adaugă câmpurile:
| Câmp | Tip | Valori |
|------|-----|--------|
| `paymentStatus` | Select | `unpaid`, `paid`, `deposit_paid` |
| `paymentMethod` | Select | `cash`, `card` |
| `stripePaymentIntentId` | Text | - |
| `paidAmount` | Number | min: 0 |
| `totalAmount` | Number | min: 0 |

**Collection `prices`** — adaugă câmpurile:
| Câmp | Tip | Valori |
|------|-----|--------|
| `paymentMode` | Select | `none`, `full`, `deposit` |
| `depositPercent` | Number | min: 1, max: 99 |

### 3.2 Deploy Fly.io

```bash
# Instalează flyctl dacă nu ai
brew install flyctl

# Login
fly auth login

# Deploy (din directorul api/)
cd api
fly deploy

# Verifică că rulează
fly status
fly logs
```

### 3.3 Verificare PocketBase live

```bash
curl https://casa-chindea.fly.dev/api/health
# → {"code":200,"message":"API is healthy."}
```

---

## 4. Deploy Backend pe Render

> Backend-ul (Node.js/Express) se deployează pe **Render** (referit în `vercel.json` ca `casa-chindea.onrender.com`)

### 4.1 Setează environment variables pe Render

În Render Dashboard → Environment → Add environment variables:

```env
NODE_ENV=production
PORT=3001
POCKET_BASE_URL=https://casa-chindea.fly.dev
POCKETBASE_ADMIN_EMAIL=raresmaier123@gmail.com
POCKETBASE_ADMIN_PASSWORD=<parola_admin_pb>
JWT_SECRET=<secretul_generat_la_pasul_2.1>
SMTP_USER=raresmaier123@gmail.com
SMTP_PASS=<app_password_gmail>
CONTACT_TO=raresmaier123@gmail.com
CONTACT_PHONE=+40744308651
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WHATSAPP_PHONE_ID=954564601075414
WHATSAPP_TOKEN=<token_whatsapp>
OWNER_WHATSAPP_PHONE=40744308651
RECAPTCHA_SECRET=6LdPSWgsAAAAAFeR6XlvK5pRvYjU4RhgSVeFWw3Z
FRONTEND_URL=https://casa-chindea.vercel.app
```

### 4.2 Build & Start commands pe Render

```
Build command:  cd backend && npm install
Start command:  cd backend && node index.js
```

### 4.3 Verificare backend live

```bash
curl https://casa-chindea.onrender.com/api/health
# → {"status":"ok","timestamp":"..."}

curl https://casa-chindea.onrender.com/api/prices
# → {"success":true,"prices":{...}}

curl https://casa-chindea.onrender.com/api/payment/config
# → {"success":true,"paymentMode":"...","publishableKey":"pk_live_..."}
```

---

## 5. Deploy Frontend pe Vercel

### 5.1 Actualizează `vercel.json`

Asigură-te că URL-ul backend-ului e corect:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://casa-chindea.onrender.com/api/:path*"
    }
  ]
}
```

### 5.2 Deploy

```bash
# Din root-ul proiectului
vercel --prod

# sau prin GitHub push (dacă ai conectat repo-ul)
git push origin main
```

### 5.3 Verificare frontend live

- [ ] `https://casa-chindea.vercel.app` se încarcă
- [ ] Navigare între pagini funcționează
- [ ] `https://casa-chindea.vercel.app/api/health` returnează `{"status":"ok"}`

---

## 6. Configurare Stripe Webhooks

> Fără webhook, plățile cu cardul nu se confirmă automat dacă browserul se închide.

### 6.1 Adaugă endpoint în Stripe Dashboard

1. [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**
3. URL: `https://casa-chindea.onrender.com/api/payment/webhook`
4. Events de ascultat: ✅ `payment_intent.succeeded`
5. Copiază **Signing secret** (`whsec_...`)

### 6.2 Setează webhook secret pe Render

```bash
# În Render Dashboard → Environment
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 6.3 Testează webhook-ul

```bash
# Instalează Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events local pentru test
stripe listen --forward-to localhost:3001/api/payment/webhook

# Într-un alt terminal — simulează o plată reușită
stripe trigger payment_intent.succeeded
```

---

## 7. Configurare WhatsApp Business

### 7.1 Verifică token-ul activ

Token-ul WhatsApp expiră periodic. Verifică:

```bash
curl -s "https://graph.facebook.com/v18.0/me?access_token=<WHATSAPP_TOKEN>" | python3 -m json.tool
```

### 7.2 Template-uri mesaje (pentru producție)

Meta impune template-uri pre-aprobate pentru mesaje inițiale. Verifică în:
**Meta Business Suite → WhatsApp → Message Templates**

Template-uri necesare:
- `booking_confirmation` — confirmare rezervare
- `booking_payment_confirmed` — confirmare plată
- `booking_cancelled` — anulare rezervare

### 7.3 Număr de telefon producție

În `.env` producție:
```env
# Scoate TEST_WHATSAPP_PHONE — în producție se trimit la numărul real al clientului
# TEST_WHATSAPP_PHONE=  # comentat sau șters
```

---

## 8. Testare end-to-end în producție

Fă aceste teste **pe URL-ul live** după deploy:

### 8.1 Flow complet rezervare cu card

```
1. Deschide https://casa-chindea.vercel.app/js/pages/booking.html
2. Login cu un cont de test
3. Completează formularul de rezervare
4. Submit → modal plată apare
5. Alege "Plătesc cu cardul"
6. Introdu: 4242 4242 4242 4242 | 12/29 | 123
7. Confirmă plata
8. Verifică în PocketBase: status=confirmed, paymentStatus=paid
9. Verifică că WA a fost trimis pe telefonul owner-ului
```

### 8.2 Flow complet rezervare cash

```
1. Same flow până la modal
2. Alege "Plătesc cash la sosire"
3. Verifică în PocketBase: paymentMethod=cash, status=pending
4. Admin confirmă manual din dashboard
5. Verifică WA de confirmare trimis
```

### 8.3 Test contact form

```
1. https://casa-chindea.vercel.app/js/pages/contact.html
2. Completează toate câmpurile
3. Submit
4. Verifică email primit la CONTACT_TO cu subject "🏡 Casa Chindea | Mesaj nou:..."
```

### 8.4 Test admin dashboard

```
1. Login cu cont admin
2. Tab Prețuri → schimbă paymentMode la "deposit", 30%
3. Verifică booking.html — modalul arată "Avans (30%)"
4. Tab Oferte → adaugă o ofertă cu imagine
5. Verifică offers.html → oferta apare
6. Tab Rezervări → confirmă o rezervare cash
7. Verifică WA trimis
```

---

## 9. Checklist final înainte de lansare

### 🔴 CRITIC — fără astea nu merge

- [ ] `stripe` în `backend/package.json` dependencies ✅ (deja adăugat)
- [ ] `STRIPE_SECRET_KEY=sk_live_...` setat pe Render
- [ ] `STRIPE_PUBLISHABLE_KEY=pk_live_...` setat pe Render
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` setat pe Render
- [ ] Câmpurile de plată adăugate în PocketBase (booking + prices collections)
- [ ] `POCKET_BASE_URL` pe Render pointează la `https://casa-chindea.fly.dev`
- [ ] `NODE_ENV=production` setat pe Render
- [ ] Webhook URL înregistrat în Stripe Dashboard

### 🟡 IMPORTANT — funcționalitate degradată fără astea

- [ ] Gmail App Password valid și setat la `SMTP_PASS`
- [ ] Domeniul de producție adăugat în Google reCAPTCHA console
- [ ] WhatsApp token activ (nu expirat)
- [ ] `FRONTEND_URL` setat la URL-ul Vercel real
- [ ] `TEST_WHATSAPP_PHONE` comentat/șters în producție
- [ ] `verified: true` se setează corect la înregistrare (fix aplicat în auth-server.js)

### 🟢 RECOMANDAT — calitate & securitate

- [ ] JWT_SECRET generat aleator (64+ chars), nu valoarea default
- [ ] HTTPS forțat pe toate serviciile (Fly.io ✅, Render ✅, Vercel ✅)
- [ ] Backup PocketBase (`pb_data/`) înainte de primul deploy în producție
- [ ] Testează cu Stripe test keys înainte să activezi live keys
- [ ] Setează limită rate limiting pe `/api/auth/register` (deja există pentru contact)
- [ ] Verifică că `.env` și `.env.local` sunt în `.gitignore` ✅

### 🔵 OPȚIONAL — îmbunătățiri post-lansare

- [ ] Domeniu custom (ex: `casachindea.ro`) pentru Vercel + Render
- [ ] Email de confirmare rezervare automat (după plată card / confirmare admin)
- [ ] Google Analytics / Plausible pentru tracking
- [ ] Backup automat PocketBase (Fly.io Volumes snapshot)
- [ ] Monitoring uptime (UptimeRobot — gratuit)

---

## 🚀 Comandă rapidă deploy complet

```bash
# 1. Aplică migrările în PocketBase local (Admin UI)

# 2. Deploy PocketBase
cd api && fly deploy && cd ..

# 3. Push backend pe Render (prin GitHub sau manual)
git add . && git commit -m "deploy: production ready" && git push

# 4. Deploy frontend pe Vercel
vercel --prod

# 5. Verificare finală
curl https://casa-chindea.onrender.com/api/health
curl https://casa-chindea.onrender.com/api/payment/config
curl https://casa-chindea.fly.dev/api/health
```

---

## 📞 Contact & Suport

- **PocketBase Admin:** https://casa-chindea.fly.dev/_/
- **Backend logs:** `fly logs` sau Render Dashboard → Logs
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Meta WhatsApp:** https://business.facebook.com

---

## 10. Backup automat PocketBase

### Cum funcționează

Un **GitHub Action** rulează automat **în fiecare Luni la 06:00 ora României**:

1. Se autentifică la PocketBase pe Fly.io
2. Crează un backup `.zip` al bazei de date
3. Descarcă backup-ul
4. Îl salvează ca **GitHub Release** (permanent, descărcabil)
5. Șterge backup-urile vechi de pe server (păstrează ultimele 4)

### Setup — O singură dată

#### Pasul 1: Adaugă secretele în GitHub

```
GitHub → repo → Settings → Secrets and variables → Actions → New repository secret
```

| Secret | Valoare |
|--------|---------|
| `PB_ADMIN_EMAIL` | `raresmaier123@gmail.com` |
| `PB_ADMIN_PASSWORD` | parola admin PocketBase |

> `GITHUB_TOKEN` e automat — nu trebuie adăugat manual.

#### Pasul 2: Push workflow-ul

```bash
git add .github/workflows/backup.yml
git commit -m "feat: automated weekly PocketBase backup"
git push origin main
```

#### Pasul 3: Verifică

- Mergi la **GitHub → repo → Actions → 🗄️ PocketBase Backup**
- Click **"Run workflow"** → rulează manual prima dată
- Verifică în **Releases** că apare backup-ul

### Backup manual din Admin Dashboard

Din admin panel poți crea backup-uri oricând:

```
POST /api/admin/backup   (necesită token admin)
GET  /api/admin/backups   (listează backup-uri existente)
```

### Modifică frecvența

Editează `.github/workflows/backup.yml` → linia `cron`:

| Frecvență | Cron |
|-----------|------|
| Zilnic la 3:00 UTC | `0 3 * * *` |
| Săptămânal (Luni) | `0 3 * * 1` |
| La fiecare 2 săptămâni | `0 3 1,15 * *` |
| Lunar (ziua 1) | `0 3 1 * *` |

### Unde sunt backup-urile?

- **GitHub Releases:** `https://github.com/raresmaier234/Casa-Chindea/releases`
  - Permanente, descărcabile, versionizate
- **Pe PocketBase server:** `https://casa-chindea.fly.dev/_/#/settings/backups`
  - Ultimele 4, se rotesc automat

### Restaurare din backup

```bash
# 1. Descarcă backup-ul din GitHub Releases
# 2. Upload prin PocketBase Admin UI:
#    https://casa-chindea.fly.dev/_/#/settings/backups
#    → Click "Restore" → selectează .zip-ul
```

---

*Generat: Martie 2026 | Casa Chindea v1.0*

