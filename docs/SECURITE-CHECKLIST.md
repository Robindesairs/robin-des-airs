# Sécurité Robin des Airs — Checklist & procédures

Dernière mise à jour : 2026-05-27

**Audit détaillé :** [`AUDIT-SECURITE-2026-05-27.md`](./AUDIT-SECURITE-2026-05-27.md) (note **9,5/10** — 10/10 avec Cloudflare + password Netlify interne).

---

## ✅ Protections déjà en place (code)

### Headers HTTP (`_headers`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS 2 ans)
- `Content-Security-Policy` stricte (scripts/styles whitelistés, `frame-ancestors 'self'`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (DENY sur `/crm/*` et endpoints auth/signature)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` : caméra/micro/géoloc/payment/usb/FLoC désactivés
- `Cross-Origin-Opener-Policy: same-origin`
- `Cache-Control: no-store` sur tous les endpoints sensibles

### Code applicatif
- ✅ Aucun secret hardcodé dans le repo (audit `grep -rE 'api_key|secret|token|password'`)
- ✅ `.env` ignoré par git (seul `.env.example` committé)
- ✅ 0 vulnérabilité `npm audit` sur les dépendances serverless
- ✅ Hash de mots de passe agences (scrypt via `lib/password-hash.js`)
- ✅ HMAC SHA-256 pour les cookies de session (CRM + agences)
- ✅ Cookie `HttpOnly` + `Secure` + `SameSite`
- ✅ **Comparaisons timing-safe** sur secrets/cookies (`lib/safe-compare.js`)
- ✅ **Rate-limiting** par IP (Netlify Blobs) sur :
  - `crm-auth` : 10 logins / 60s
  - `agency-auth` : 8 logins / 60s (+ par code agence)
  - `sign-mandate` : 5 signatures / 60s
  - `yousign-init` : 3 init / 60s (protection budget API)
  - `submit-mandat` : 5 / 60s
  - `submit-partner-agreement` : 3 / 60s
- ✅ Anonymisation IP RGPD (hash quotidien dans `sign-mandate`)
- ✅ Pages internes (`/radar*`, `/crm*`, `/interne`, `/generateur-pub`) en `noindex,nofollow`
- ✅ Sitemap propre (aucune route interne exposée à Google)
- ✅ **2026-05-27** : `ALLOW_AGENCY_CODE_ONLY` retiré de `netlify.toml` + désactivé en prod dans `auth-config.js`
- ✅ **2026-05-27** : API `radar` (scan live) et `radar-stats` protégées par session CRM (`checkCrmAccess`)
- ✅ **2026-05-27** : `send-whatsapp` fail-closed en production si `WHATSAPP_WEBHOOK_SECRET` absent
- ✅ **2026-05-27** : `crm-backup` CORS limité à `SITE_ORIGIN` (plus `*`)
- ✅ **2026-05-27** : `lib/internal-auth.js` — jobs radar/morning/snapshot/telegram protégés par secret
- ✅ **2026-05-27** : Rate-limit APIs publiques (vol-ticker, flight-info, airport-search, analyze-flight)
- ✅ **2026-05-27** : `allowInsecureAuth` fail-closed en production
- ✅ **2026-05-27** : `_headers` + `robots.txt` — pages radar legacy et `/api/` non indexables

### Backup local
- Branche `backup-YYYYMMDD-HHMM` (rollback en 1 commande)
- Tag `snapshot-YYYYMMDD-HHMM`

---

## ⚠️ À FAIRE — Netlify dashboard (10 min, manuel)

### 1. HTTPS forcé
- **Netlify → Site settings → Domain management → HTTPS**
- ✔ Cocher **« Force HTTPS »** / **« Force TLS connection »**
- ✔ Vérifier que le certificat Let's Encrypt est actif et auto-renew

### 2. Visitor access sur pages internes
- **Netlify → Site settings → Access control**
- Pour `/crm/*`, `/radar/*`, `/interne` : activer **password protection** (Pro) ou **role-based access** (Enterprise)
- `noindex` empêche Google de voir, mais **n'importe qui qui connaît l'URL peut accéder** → ajouter une vraie auth

### 3. Vérifier les variables d'environnement
- **Netlify → Site settings → Environment variables**
- Confirmer que **toutes** les clés sont là (et pas dans le code) :
  - `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`
  - `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`
  - `YOUSIGN_API_KEY`
  - `WHATSAPP_TOKEN`, `WATI_API_KEY`
  - `GEMINI_API_KEY`
  - `CRM_ACCESS_CODE`, `CRM_AUTH_SECRET`
  - `WHATSAPP_WEBHOOK_SECRET` — **obligatoire en prod** pour `/api/send-whatsapp` (même valeur dans Make : `"secret": "…"`)
  - `AGENCY_AUTH_SECRET`, `AGENCY_ACCOUNTS`
  - `MANDAT_LINK_SECRET`
  - `RESEND_API_KEY`
- ✅ **27/05/2026** : config revue (fondateur) — `WHATSAPP_WEBHOOK_SECRET` OK, pas de `ALLOW_AGENCY_CODE_ONLY`
- ⚠️ Ne **jamais** définir `ALLOW_INSECURE_AUTH` ni `ALLOW_AGENCY_CODE_ONLY` en prod

### 4. Notifications de déploiement
- **Netlify → Site settings → Build & deploy → Deploy notifications**
- Activer Slack/email sur **« Deploy failed »** et **« Deploy locked »**

### 5. Audit logs
- **Netlify → Team → Audit log** (plan Pro+) — consulter mensuellement

---

## 🛡️ À FAIRE — Cloudflare devant Netlify (recommandé, gratuit)

### Pourquoi
- DDoS protection automatique (illimité, même en plan gratuit)
- WAF avec règles managées OWASP
- Rate-limiting Edge (avant que la requête atteigne Netlify = pas de coût compute)
- Bot Fight Mode (bloque les scrapers basiques gratuitement)

### Setup
1. Créer compte sur https://dash.cloudflare.com
2. Ajouter `robindesairs.eu` → choisir plan **Free**
3. Cloudflare donne 2 nameservers → les mettre chez ton registrar
4. Une fois actif :
   - **SSL/TLS → Overview** : passer à **« Full (strict) »**
   - **SSL/TLS → Edge Certificates** : activer **« Always Use HTTPS »** + **« HSTS »**
   - **Security → Bots** : activer **« Bot Fight Mode »**
   - **Security → DDoS** : laisser sur défauts
   - **Security → WAF → Managed rules** : activer **Cloudflare Managed Ruleset** (Free)
   - **Security → WAF → Rate limiting rules** :
     - Règle 1 : `(http.request.uri.path contains "/api/")` → 60 req/min/IP
     - Règle 2 : `(http.request.uri.path eq "/.netlify/functions/yousign-init")` → 5 req/min/IP
     - Règle 3 : `(http.request.uri.path eq "/.netlify/functions/crm-auth")` → 20 req/min/IP
   - **Caching → Configuration** : caching agressif sur statique, **Bypass** sur `/api/*`
   - **Page Rules** (3 gratuites) :
     - `*robindesairs.eu/api/*` → Cache Level: Bypass, Security Level: High

### Coût
- Plan Free suffit pour tout ce qui précède. Pro ($25/mois) ajoute WAF avancé + Image Resize.

---

## 🔍 À FAIRE — Audit récurrent

### Hebdomadaire (5 min)
```bash
cd ~/Documents/GitHub/robin-des-airs/netlify/functions
npm audit
```

### Mensuel (30 min)
- Vérifier les logs Netlify Functions (erreurs 5xx, latence anormale)
- Consulter Cloudflare Analytics → Top blocked threats
- Tester le cadenas HTTPS sur https://www.ssllabs.com/ssltest/analyze.html?d=robindesairs.eu (objectif : note A ou A+)
- Tester les headers sur https://securityheaders.com/?q=robindesairs.eu (objectif : note A ou A+)

### Trimestriel
- Rotation des secrets sensibles (`CRM_AUTH_SECRET`, `MANDAT_LINK_SECRET`) :
  1. Générer un nouveau secret : `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  2. Mettre à jour la variable sur Netlify
  3. Les sessions existantes seront invalidées (les utilisateurs devront se reconnecter — c'est le but)

---

## 🚨 Procédure en cas d'incident

### Site défacé / code malveillant injecté
```bash
cd ~/Documents/GitHub/robin-des-airs

# Identifier le dernier backup propre
git tag | grep snapshot- | tail -5

# Rollback complet (remplace TAG par le bon)
git reset --hard snapshot-20260525-2102
git push --force origin main
```

### Fuite suspectée d'un secret
1. **Révoquer la clé** côté provider (Amadeus, YouSign, Airtable, WhatsApp...) — immédiatement
2. Générer une nouvelle clé
3. Mettre à jour la variable Netlify
4. Trigger redeploy
5. Si le secret était dans un commit : `git filter-repo` ou contacter GitHub support

### Brute force détecté
- Cloudflare : Security → Events → repérer l'IP → ajouter une règle "Block"
- Sans Cloudflare : le rate-limiting code bloque déjà à 8-10 tentatives/min

### Compromission compte CRM
1. Changer `CRM_ACCESS_CODE` immédiatement
2. Changer `CRM_AUTH_SECRET` (invalide toutes les sessions)
3. Redeploy

---

## 📞 Contacts d'urgence
- Netlify support : https://www.netlify.com/support/
- Cloudflare support : https://dash.cloudflare.com/support
- CNIL (incident RGPD < 72h) : https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles
