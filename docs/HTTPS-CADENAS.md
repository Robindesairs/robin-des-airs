# Pourquoi je n'ai pas le cadenas (HTTPS) ?

Le cadenas dans la barre d’adresse signifie que la page est servie en **HTTPS**. Sans HTTPS, le navigateur n’affiche pas le cadenas (et peut afficher « Non sécurisé »).

---

## 1. Toujours ouvrir le site en https://

Ouvre **https://robindesairs.eu** (avec le **s** dans https).  
Si tu tapes **http://** (sans s), la page est en clair et le cadenas n’apparaît pas.

Après déploiement, les redirections dans `netlify.toml` envoient automatiquement **http → https** (301). Une fois déployé, même en tapant `http://robindesairs.eu`, tu seras redirigé vers `https://` et le cadenas s’affichera.

---

## 2. Activer « Force TLS » sur Netlify

Pour que Netlify redirige bien tout le trafic HTTP vers HTTPS :

1. Va sur **app.netlify.com** → ton site Robin des Airs.
2. **Domain management** (ou **Paramètres du domaine**).
3. Section **HTTPS**.
4. Active **« Force TLS connection »** (ou « Redirect HTTP to HTTPS »).

Cela garantit que tout visiteur en `http://` est redirigé vers `https://`.

---

## 3. Certificat SSL (domaine personnalisé)

Netlify fournit un certificat **Let’s Encrypt** gratuit pour ton domaine.  
Si le domaine (robindesairs.eu) vient d’être ajouté, le certificat peut prendre **quelques minutes à quelques heures**. Pendant ce temps, l’accès en HTTPS peut ne pas être disponible ou le cadenas peut ne pas s’afficher tout de suite.

- Vérifier : **Domain management** → **HTTPS** → statut du certificat ( « Certificate » ).
- Le **DNS** du domaine doit pointer vers Netlify (enregistrements A/CNAME indiqués par Netlify).

---

## 4. Contenu mixte (ressources en http)

Si la page est bien en **https://** mais que du contenu (images, scripts, polices) est chargé en **http://**, le navigateur peut considérer la page comme « non sécurisée » et ne pas afficher le cadenas.

Dans le projet Robin des Airs, les liens (CDN, canonique, etc.) sont déjà en **https://**. Rien à changer côté code pour ça.

---

## En résumé

| Action | Où |
|--------|-----|
| Ouvrir le site en **https://robindesairs.eu** | Navigateur |
| Activer **Force TLS connection** | Netlify → Domain management → HTTPS |
| Redirections **http → https** | Déjà dans `netlify.toml` (après déploiement) |
| Vérifier le certificat SSL | Netlify → Domain management → HTTPS |

Une fois **Force TLS** activé et le site déployé avec le `netlify.toml` à jour, le cadenas doit s’afficher quand tu accèdes au site en **https://**.
