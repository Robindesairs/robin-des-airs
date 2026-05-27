# Audit sécurité — Robin des Airs

**Date :** 27 mai 2026  
**Site :** https://robindesairs.eu  
**Note globale :** 7,5/10 → **8,5/10** après correctifs code + config Netlify

**Statut config Netlify (Climbié) :** variables revues le 27/05/2026 — `WHATSAPP_WEBHOOK_SECRET` défini, `ALLOW_AGENCY_CODE_ONLY` retiré.

---

## Synthèse

| Priorité | Problème | Action | Statut |
|----------|----------|--------|--------|
| P0 | Connexion agence sans mot de passe (`ALLOW_AGENCY_CODE_ONLY`) | Retiré de `netlify.toml` + fail-closed en prod dans `auth-config.js` | ✅ Code |
| P0 | `send-whatsapp` ouvert si pas de secret | Fail-closed prod + `safeEqualString` sur le secret | ✅ Code |
| P0 | Secrets Netlify | Dashboard : pas de `ALLOW_*` insecure ; `WHATSAPP_WEBHOOK_SECRET` présent | ✅ Manuel |
| P1 | API `radar` publique (quota RapidAPI) | Auth CRM (`checkCrmAccess`) sauf `?mode=ticker-banner` (cache) | ✅ Code |
| P1 | API `radar-stats` publique | Auth CRM | ✅ Code |
| P1 | Pages radar sans cookie API | `credentials: 'include'` + `radar-gate.js` sur pages legacy | ✅ Code |
| P2 | CORS `*` sur `crm-backup` | `SITE_ORIGIN` via `corsHeaders()` | ✅ Code |
| P2 | HTML CRM/radar accessibles par URL | Password Netlify sur `/crm/*`, `/radar*` | ⏳ Manuel (plan Pro) |
| P2 | Pas de WAF edge | Cloudflare Free devant le domaine | ⏳ Recommandé |

---

## Points forts (inchangés)

- HSTS, CSP, X-Frame-Options, Permissions-Policy (`_headers`)
- Aucun secret dans le dépôt ; `npm audit` functions = 0 vulnérabilité
- Auth CRM : cookie HMAC + `X-CRM-Code`, rate-limit, comparaisons timing-safe
- Agences : scrypt, rate-limit `agency-auth`
- Mandats / YouSign : rate-limit
- Webhooks Airtable : secret obligatoire
- Outils internes : `noindex` + `robots.txt` Disallow + absent du sitemap

---

## Correctifs code (commit `fix(security): …`)

### `netlify.toml`
- Suppression de `ALLOW_AGENCY_CODE_ONLY = "true"` en production.

### `netlify/functions/lib/auth-config.js`
- `allowAgencyCodeOnly()` retourne **toujours `false`** si `isProduction()` — même si la variable existe encore sur Netlify.

### `netlify/functions/send-whatsapp.js`
- Production sans `WHATSAPP_WEBHOOK_SECRET` → **503**.
- Secret comparé avec `safeEqualString`.
- CORS limité au site (`corsHeaders()`).

### `netlify/functions/radar.js`
- Scan live AeroDataBox : **401** sans session CRM.
- Exception : `GET ?mode=ticker-banner` — lecture seule du cache Blobs (pas d’appel API).

### `netlify/functions/radar-stats.js`
- **401** sans auth CRM.

### `netlify/functions/crm-backup.js`
- CORS : origine fixe (`robindesairs.eu`), plus `*`.

### Frontend
- `assets/radar-live.js` : `credentials: 'include'` sur le scan live.
- `radar-direct.html`, `radar-v3.html`, `test-radar.html` : `radar-gate.js` + cookies.

### Scripts ops
- `scripts/fetch-vols-radar.{sh,js}` : header `X-CRM-Code` via `CRM_ACCESS_CODE`.

---

## Endpoints publics vs protégés (après deploy)

| Endpoint | Public ? | Remarque |
|----------|----------|----------|
| `/api/vol-ticker` | Oui | Bandeau accueil ; scan serveur + cache |
| `/api/radar-snapshot` | Oui | Snapshot matin (Blobs) |
| `/.netlify/functions/radar` | **Non** | Cookie CRM ou `X-CRM-Code` |
| `/.netlify/functions/radar?mode=ticker-banner` | Cache seul | Pas de scan si cache vide → 401 |
| `/api/radar-stats` | **Non** | CRM |
| `/api/send-whatsapp` | **Non** | Body `"secret"` = `WHATSAPP_WEBHOOK_SECRET` |
| `/api/crm-auth`, `/api/crm-backup`, … | **Non** | CRM |

---

## Variables Netlify — référence

| Variable | Rôle | Valeur |
|----------|------|--------|
| `CRM_ACCESS_CODE` | Code saisi par l’équipe (CRM + porte radar) | Mot de passe interne choisi par vous |
| `CRM_AUTH_SECRET` | Signature cookie `rda_crm` | Chaîne aléatoire **≠** du code d’accès (`openssl rand -hex 32`) |
| `WHATSAPP_WEBHOOK_SECRET` | Protection `/api/send-whatsapp` | Chaîne aléatoire ; **même valeur** dans Make (`"secret": "…"`) |
| `ALLOW_AGENCY_CODE_ONLY` | — | **Ne pas définir** en prod |
| `ALLOW_INSECURE_AUTH` | — | **Ne pas définir** en prod |

Voir aussi : `docs/NETLIFY-PROD.md`, `docs/SECURITE-CHECKLIST.md`, `WHATSAPP-AUTO.md`.

---

## Tests post-déploiement

```bash
# Radar live protégé
curl -s -o /dev/null -w "%{http_code}\n" "https://robindesairs.eu/.netlify/functions/radar"
# Attendu : 401

# Bandeau accueil OK
curl -s -o /dev/null -w "%{http_code}\n" "https://robindesairs.eu/api/vol-ticker"
# Attendu : 200

# WhatsApp sans secret dans le body
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://robindesairs.eu/api/send-whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"to":"33600000000","text":"test"}'
# Attendu : 403
```

Navigation : `/crm/` et `/radar-vols-v2.html` → code équipe → données radar.

---

## Reste à faire (non bloquant deploy)

1. **Netlify Access control** : mot de passe sur `/crm/*` et `/radar*` (en plus du code applicatif).
2. **Cloudflare Free** : DDoS, Bot Fight, rate-limit edge sur `/api/*`.
3. **Rotation trimestrielle** : `CRM_AUTH_SECRET`, `WHATSAPP_WEBHOOK_SECRET` si fuite suspectée.

---

## Historique

| Date | Événement |
|------|-----------|
| 2026-05-25 | Checklist initiale `SECURITE-CHECKLIST.md` |
| 2026-05-27 | Audit + correctifs code ; config Netlify validée par le fondateur |
| 2026-05-27 | Ce document + commit `fix(security): …` |
