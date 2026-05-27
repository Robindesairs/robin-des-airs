# Audit sécurité — Robin des Airs

**Date :** 27 mai 2026 (mise à jour renforcée)  
**Site :** https://robindesairs.eu  
**Note globale :** **9,5 / 10** (code + config Netlify) — **10/10** avec Cloudflare + mot de passe Netlify sur `/crm` et `/radar`

**Statut config Netlify :** validée par le fondateur (`WHATSAPP_WEBHOOK_SECRET`, pas de `ALLOW_AGENCY_CODE_ONLY`).

---

## Synthèse

| Priorité | Problème | Action | Statut |
|----------|----------|--------|--------|
| P0 | Connexion agence sans mot de passe | `ALLOW_AGENCY_CODE_ONLY` retiré + fail-closed prod | ✅ |
| P0 | `send-whatsapp` / `send-preuve-pdf` ouverts | Fail-closed prod + `safeEqualString` | ✅ |
| P0 | Secrets Netlify | Dashboard configuré | ✅ Manuel |
| P1 | API `radar` / `radar-stats` publiques | Auth CRM | ✅ |
| P1 | `radar-monitor` / snapshot déclenchables par URL | Secret requis si `?force=` | ✅ |
| P1 | `analyze-flight` (Claude) abusable | `WHATSAPP_WEBHOOK_SECRET` + rate-limit 8/min | ✅ |
| P1 | CORS `*` sur APIs | Origine `robindesairs.eu` | ✅ |
| P1 | APIs RapidAPI sans limite | Rate-limit vol-ticker, flight-info, airport-search | ✅ |
| P2 | HTML CRM/radar par URL | Password Netlify | ⏳ Plan Pro |
| P2 | WAF edge | Cloudflare Free | ⏳ Recommandé |

---

## Module `lib/internal-auth.js`

- Cron Netlify : header `x-netlify-event: schedule` → pas de secret.
- Appels manuels : `?secret=`, `body.secret`, ou header `X-Rda-Secret`.
- Secrets acceptés (au moins un sur Netlify) : `RADAR_MONITOR_SECRET`, `AIRTABLE_WEBHOOK_SECRET`, `CRM_AUTH_SECRET`, `WHATSAPP_WEBHOOK_SECRET`.

---

## Rate-limiting (Netlify Blobs)

| Endpoint | Limite |
|----------|--------|
| `vol-ticker` | 40 / min / IP |
| `flight-info` | 25 / min |
| `airport-search` | 35 / min |
| `radar-snapshot` | 60 / min |
| `analyze-flight` | 8 / min |
| `crm-auth` | 10 / min (existant) |

---

## Endpoints publics vs protégés

| Endpoint | Public ? |
|----------|----------|
| `/api/vol-ticker` | Oui (rate-limit) |
| `/api/radar-snapshot` | Oui (rate-limit) |
| `/.netlify/functions/radar` (scan) | **Non** (CRM) |
| `/api/radar-stats` | **Non** (CRM) |
| `/api/radar-monitor?force=*` | **Non** (secret) |
| `/api/daily-radar-snapshot` | **Non** (secret) |
| `/api/morning-report` | **Non** (secret ou cron) |
| `/api/send-whatsapp`, `send-preuve-pdf` | **Non** (`WHATSAPP_WEBHOOK_SECRET`) |
| `/api/analyze-flight` | **Non** (même secret Make) |
| `/api/telegram-notify` | **Non** (secret interne) |

---

## Fail-closed production (`auth-config.js`)

- `allowAgencyCodeOnly()` → toujours `false` en prod.
- `allowInsecureAuth()` → toujours `false` en prod.

---

## Tests post-déploiement

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://robindesairs.eu/.netlify/functions/radar"
# 401

curl -s -o /dev/null -w "%{http_code}\n" "https://robindesairs.eu/api/vol-ticker"
# 200

curl -s -o /dev/null -w "%{http_code}\n" \
  "https://robindesairs.eu/api/radar-monitor?force=morning"
# 401 sans secret

curl -s -o /dev/null -w "%{http_code}\n" \
  "https://robindesairs.eu/api/radar-monitor?force=morning&secret=VOTRE_SECRET"
# 200 si secret OK
```

---

## Pour atteindre 10/10

1. **Netlify → Access control** : mot de passe sur `/crm/*`, `/radar*`, `/interne`.
2. **Cloudflare Free** devant le domaine (DDoS, Bot Fight, rate-limit `/api/*`).

---

## Historique

| Date | Événement |
|------|-----------|
| 2026-05-27 | Audit initial + correctifs P0/P1 |
| 2026-05-27 | Renforcement : internal-auth, rate-limits, CORS, headers, robots |
