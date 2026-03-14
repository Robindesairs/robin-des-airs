# Robin des Airs — Dossiers (Next.js + Supabase)

Back-office dossiers indemnisation : API et base alignées sur le **schéma v2.0** (`docs/schema-dossier-indemnisation.json`).

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + client JS)

## Démarrage

```bash
cd robin-dossiers
npm install
cp .env.local.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Base Supabase

- **Project ID** : `qrrvzvltwtfzgvfiynkv`
- **Dashboard** : [https://supabase.com/dashboard/project/qrrvzvltwtfzgvfiynkv](https://supabase.com/dashboard/project/qrrvzvltwtfzgvfiynkv)

1. Créer un projet sur [supabase.com](https://supabase.com) (ou utiliser le projet ci-dessus).
2. Dans **SQL Editor**, exécuter le script :
   `supabase/migrations/20260101000000_schema_dossiers_v2.sql`
3. Copier l’URL du projet et la clé anon dans `.env.local`.

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
