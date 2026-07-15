-- ============================================================================
-- Robin des Airs — Setup table `dossiers` sur le NOUVEAU projet Supabase
-- Projet : thqykzjchvhijjeblpdi
-- À coller dans Supabase → SQL Editor → Run. Idempotent (réexécutable sans risque).
--
-- Différence VOLONTAIRE avec l'ancien schéma v2 : la policy RLS n'est PAS
-- « allow all for anon » (faille RGPD : la clé publique circule dans le
-- navigateur). Ici, accès réservé au rôle `authenticated` — l'app impose déjà
-- le login (middleware.ts), donc rien ne casse, mais un visiteur déconnecté
-- (ou quiconque récupère la clé publique) ne voit RIEN.
-- ============================================================================

-- ── Enums (gardés idempotents : CREATE TYPE ne supporte pas IF NOT EXISTS) ──
do $$ begin
  create type statut_dossier as enum (
    'BROUILLON', 'ELIGIBLE', 'NON_ELIGIBLE', 'MANDAT_SIGNE',
    'LRAR_ENVOYEE', 'RELANCE_1', 'RELANCE_2', 'MEDIATEUR',
    'CONTENTIEUX', 'PAYE', 'REFUSE_DEFINITIF', 'ABANDON', 'PRESCRIT'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type priorite_dossier as enum ('BASSE', 'STANDARD', 'HAUTE', 'URGENTE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type langue_client as enum ('fr', 'wo', 'bm', 'ln', 'ff', 'snk', 'en');
exception when duplicate_object then null; end $$;

-- ── Table principale : un dossier = une ligne, sous-objets en JSONB ──
create table if not exists dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_interne TEXT UNIQUE NOT NULL,
  statut statut_dossier NOT NULL DEFAULT 'BROUILLON',
  motif_non_eligibilite TEXT,
  priorite priorite_dossier NOT NULL DEFAULT 'STANDARD',
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_derniere_action TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_acquisition TEXT NOT NULL DEFAULT 'site_direct',
  agent_responsable TEXT NOT NULL DEFAULT '',
  langue_client langue_client NOT NULL DEFAULT 'fr',
  passagers JSONB NOT NULL DEFAULT '[]'::jsonb,
  vol JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculs_financiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  suivi_juridique JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultat_final JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index recherches courantes ──
create index if not exists idx_dossiers_statut        on dossiers(statut);
create index if not exists idx_dossiers_id_interne    on dossiers(id_interne);
create index if not exists idx_dossiers_date_creation on dossiers(date_creation desc);
create index if not exists idx_dossiers_vol_pnr       on dossiers using gin ((vol->'pnr'));

-- ── Trigger updated_at ──
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dossiers_updated_at on dossiers;
create trigger dossiers_updated_at
  before update on dossiers
  for each row execute procedure set_updated_at();

-- ── RLS : accès réservé aux utilisateurs CONNECTÉS (rôle authenticated). ──
-- anon (déconnecté / clé publique nue) = AUCUN accès. Les écritures automatisées
-- (bot, fonctions Netlify) doivent utiliser la clé service_role, qui contourne RLS.
alter table dossiers enable row level security;

drop policy if exists "authenticated full access" on dossiers;
create policy "authenticated full access" on dossiers
  for all
  to authenticated
  using (true)
  with check (true);

comment on table dossiers is 'Dossiers indemnisation Robin des Airs — v2, RLS authenticated-only (RGPD)';
