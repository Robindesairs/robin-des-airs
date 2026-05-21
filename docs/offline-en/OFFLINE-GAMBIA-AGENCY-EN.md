# Robin des Airs — Offline pack (English)
## Gambia & partner travel agencies

**Read this file first.** Everything below is self-contained for offline reading.
Site when online: https://robindesairs.eu

---

## 1. Quick reference — The Gambia

| Topic | Detail |
|-------|--------|
| **Currency** | Gambian dalasi (**GMD**). Indicative rate in contracts: **84 GMD = €1** |
| **Commission payouts** | **Wave**, **Afrimoney**, **QMoney**, or bank transfer |
| **Demo agency (Gambia)** | **Kombo Travel Services** — code `GSA-KMS-001` |
| **Partner contact** | partners@robindesairs.eu · WhatsApp +33 6 52 89 38 58 |
| **Portal** | `/espace-agence.html` (FR/EN toggle in app) |

---

## 2. Commission tiers (locked for life at signing)

**Rule:** The tier in force on the **day the partner agreement is signed** is yours **for life**. Later lower tiers apply only to **new** agencies that sign later.

| Tier | Sign before | Commission / pax |
|------|-------------|------------------|
| **★ Founding** | 31 Aug 2026 | **4,000 GMD/pax** — first **3 agencies only** (manual activation) |
| 1 — Summer | 31 Aug 2026 | 3,800 GMD/pax |
| 2 — Autumn | 31 Dec 2026 | 3,400 GMD/pax |
| 3 — 2027 | From 1 Jan 2027 | 3,000 GMD/pax |

**Founding tier:** Not applied automatically online. After signature, Robin ops sets in `AGENCY_ACCOUNTS`: `"commissionGmd": 4000`, `"commissionTier": "founding"` if among first 3 and signed before 31/08/2026.

**Payment:** Within **48 business hours** after Robin receives **cleared** airline compensation (then pays agency via chosen method).

---

## 3. Commercial split (long-haul example, CE 261 = €600)

Europe–Africa, distance **> 3,500 km**:

| Party | Amount |
|-------|--------|
| Passenger net (agency client) | **420 €** (75% of €600 bracket) |
| **Agency commission** | **3,800 GMD** (≈ €45 at 84 GMD/€) — tier at signing |
| Robin des Airs fee | **135 €** |

CE 261 statutory brackets (€250 / €400 / €600) are **separate** from agency commission in GMD.

---

## 4. How an agency signs (end-to-end)

### Agency side

1. **Discover** — brochure, Robin contact, or link from Robin  
2. **Read tiers** — `paliers-commission-agence-en.html` (in this offline folder: `html/`)  
3. **Sign online** — `partner-agreement-en.html`  
   - Optional prefill: `?code=GSA-XXX-001&name=Agency+Name&country=The+Gambia&email=...&phone=...`  
4. **Fill form** — legal name, partner code, signatory, WhatsApp (+220…), email, address, payout method  
5. **Accept + sign** on canvas → submit  
6. **Success screen** — reference `PTR-…` — *portal activated within 24–48h*

### Robin ops (after signature)

1. Email from `/api/submit-partner-agreement` (if Resend configured)  
2. Archive in Netlify Blobs `robin-partner-agreements`  
3. Create row in **`AGENCY_ACCOUNTS`** (Netlify env JSON):

```json
{
  "code": "GSA-KMS-001",
  "passHash": "scrypt:…",
  "name": "Kombo Travel Services",
  "commissionGmd": 3800,
  "commissionTier": "ete",
  "partnerSignedAt": "2026-05-19T12:00:00.000Z",
  "airtableMatch": "GSA-KMS-001"
}
```

4. **Founding:** use `commissionGmd: 4000`, `commissionTier: "founding"`  
5. Generate password:  
   `node -e "const {hashPassword}=require('./netlify/functions/lib/password-hash'); console.log(hashPassword('YourStrongPassword'));"`  
6. Airtable: column **`Agence Partenaire Code`** = same code  
7. Send agency **code + password** on a **secure** channel (not public WhatsApp)

### Agency daily use

1. Login: **Partner portal** — code + password  
2. **New case** — form → Airtable  
3. **Ticket sold, no incident yet** — status *awaiting incident*  
4. **My cases** — refresh from Airtable  
5. **Passenger** — separate **passenger mandate** (`mandat-en.html`); Robin handles airline after mandate signed  

---

## 5. Partner portal (technical)

| Item | Value |
|------|--------|
| URL | https://robindesairs.eu/espace-agence.html |
| Auth API | `POST /api/agency-auth` |
| Cases API | `/api/agency-dossiers` |
| Data | Airtable (not browser CRM) |
| Languages | FR / EN in UI |
| Currencies shown | EUR, USD, GBP, FCFA, **GMD** |

**Demo (local dev only, `ALLOW_INSECURE_AUTH=true`):**  
- Code: `GSA-KMS-001`  
- Password: `kombo2026`  

**Demo (production example in docs):**  
- Code: `GSA-KMS-001`  
- Password: `KomboPilot2026` (communicate securely to manager)

---

## 6. Netlify environment (agencies)

| Variable | Purpose |
|----------|---------|
| `AGENCY_AUTH_SECRET` | HMAC session secret |
| `AGENCY_ACCOUNTS` | JSON array of agency accounts |
| `AGENCY_TIER1_GMD` / `AGENCY_TIER1_END` | Summer tier (default 3800 / 2026-08-31) |
| `AGENCY_TIER2_GMD` / `AGENCY_TIER2_END` | Autumn (3400 / 2026-12-31) |
| `AGENCY_TIER3_GMD` | 2027+ (3000) |
| `AGENCY_GMD_PER_EUR` | Default 84 |
| `AGENCY_CLIENT_NET_EUR` | Default 420 |
| `AGENCY_INDEMNITY_REF_EUR` | Default 600 |
| `PARTNER_AGREEMENT_NOTIFY_EMAIL` | Ops email on new signature |
| `RESEND_API_KEY` | Send notification emails |
| `AIRTABLE_API_KEY` + base/table | Case storage |

---

## 7. Airtable fields (agency cases)

When a case is created from portal or WhatsApp agency bot:

| Column | Typical value |
|--------|----------------|
| `Dossier via agence` | Yes |
| `Agence Partenaire Code` | e.g. `GSA-KMS-001` |
| `Commission Agence` | pax × €45 or × GMD if configured |
| `Montant Client` | pax × €420 |
| `Statut Dossier` | New |
| Address placeholder | “To complete (mandate) — agency deposit CODE” |

Incident option: **En attente d'incident (billet vendu)** — ticket sold, delay/cancellation not yet known.

---

## 8. WhatsApp agency bot (optional)

Separate Wati number from passenger CRM.

```
Agency WhatsApp → /api/wati-agency-webhook → menu → Airtable
```

**Setup**

- Webhook: `https://robindesairs.eu/api/wati-agency-webhook`  
- **Do not** use `/api/wati-webhook` (passengers only)

**Env:** `WATI_AGENCY_CHANNEL_PHONE`, `WATI_AGENCY_API_TOKEN`, `AGENCY_ACCOUNTS` with optional `whatsappPhones` whitelist.

**Menu**

1. New claim (delay, cancellation…)  
2. Ticket awaiting incident  
3. Last 5 cases  
4. Help  

Commands: `menu`, `cancel`.

Same Airtable as web portal.

---

## 9. Partner agreement — main articles (summary)

**Art. 1 — Purpose**  
Non-exclusive referral under EU 261/2004. Robin: no win no fee for passenger after mandate. Agency keeps normal travel services.

**Art. 2 — Commission**  
Paid per **winning passenger** at tier on signing date, **for life**. 48h after Robin receives cleared compensation. Nothing if case fails.

**Art. 3 — Files**  
Agency submits via portal; helps passenger sign mandate; Robin leads airline claim.

**Art. 4 — Agency duties**  
Good-faith data; inform passenger; alert Robin if airline/passenger contacts agency on same incident; use portal when possible.

**Art. 5 — Robin duties**  
Diligent processing; status updates; commission when due.

**Practical**  
No passenger personal email required in portal — Robin creates case email. Agency may still help with mandate on WhatsApp.

---

## 10. URLs (English)

| Page | Path |
|------|------|
| Commission brochure | `/paliers-commission-agence-en.html` |
| Partner agreement | `/partner-agreement-en.html` |
| Partner portal | `/espace-agence.html` |
| CE 261 brackets | `/ce261-brackets-en.html` |
| CE 261 deadlines | `/ce261-date-deadlines-en.html` |
| Passenger mandate | `/mandat-en.html` |
| API sign contract | `POST /api/submit-partner-agreement` |

---

## 11. What is NOT connected (as of pack date)

- **TikTok Ads API** — CRM label `tiktok_ad` only; no auto publishing  
- **Signing ≠ instant portal** — ops must add `AGENCY_ACCOUNTS`  
- **Founding 4,000 GMD** — manual only  

---

## 12. Files in this offline folder

After running `build-offline-pack.sh`:

- `OFFLINE-GAMBIA-AGENCY-EN.md` — this file  
- `FILE-LIST.txt` — copy checklist  
- `html/` — English pages (open in browser offline)  
- `assets/` — portal scripts (if you copied full pack)  
- `robin-gambia-agency-offline-en.zip` — single download  

**Tip:** On phone, open the `.md` in Files/Books or use the HTML pages in `html/` for nicer layout.

---

*Robin des Airs — EU 261/2004 · Europe–Africa corridor · partners@robindesairs.eu*
