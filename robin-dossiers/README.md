# Robin des Airs — Dossiers (Next.js + Supabase)

Back-office dossiers indemnisation : API et base alignées sur le **schéma v2.0** (`docs/schema-dossier-indemnisation.json`).

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + client JS)

## Démarrage

1. **Migration Supabase** (si la table `dossiers` n’existe pas encore) — voir section ci-dessous.
2. **Variables d’environnement** : copier `.env.local.example` vers `.env.local` et renseigner la clé publishable.
3. **Lancer l’app** :

```bash
cd robin-dossiers
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) pour le dashboard.

## Base Supabase

- **Project ID** : `qrrvzvltwtfzgvfiynkv`
- **Dashboard** : [https://supabase.com/dashboard/project/qrrvzvltwtfzgvfiynkv](https://supabase.com/dashboard/project/qrrvzvltwtfzgvfiynkv)

### Faire la migration dans le SQL Editor (si la table `dossiers` n’existe pas)

1. Ouvre le **Dashboard Supabase** du projet (lien ci-dessus).
2. Dans le menu de gauche, clique sur **SQL Editor**.
3. Clique sur **New query**.
4. Ouvre le fichier du projet :  
   `robin-dossiers/supabase/migrations/20260308100000_schema_dossiers_passagers_vols_calculs_evenements.sql`
5. Copie tout son contenu et colle-le dans l’éditeur SQL.
6. Clique sur **Run** (ou Ctrl+Enter).
7. Tu dois voir « Success » : les tables `dossiers`, `passagers`, `vols`, `calculs`, `evenements` sont créées.

Ensuite, dans le projet : `npm run dev` et tu peux tester le dashboard et les appels API.

## API Dossiers

| Méthode | Route | Description |
|--------|--------|-------------|
| GET | `/api/dossiers` | Liste (query: `?limit=50&offset=0&statut=MANDAT_SIGNE`) |
| POST | `/api/dossiers` | Créer un dossier (body JSON = schéma v2.0 ou partie) |
| GET | `/api/dossiers/[id]` | Détail par UUID ou `id_interne` |
| PATCH | `/api/dossiers/[id]` | Mise à jour partielle |
| DELETE | `/api/dossiers/[id]` | Suppression |

Le body POST peut suivre la structure complète (dossier, passagers, vol, calculs_financiers, suivi_juridique, resultat_final) ou seulement les champs fournis ; le reste est complété par des valeurs par défaut.

## Types

Les types TypeScript (schéma v2.0) sont dans `src/types/dossier.ts` et `src/types/database.ts`.
