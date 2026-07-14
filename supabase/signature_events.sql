-- ============================================================================
-- Robin des Airs — Journal de preuve des signatures (DOUBLE append-only)
-- À coller dans Supabase → SQL Editor → Run. Idempotent (réexécutable sans risque).
--
-- Rôle : copie infalsifiable du faisceau de preuve eIDAS, en plus de Netlify Blobs.
-- Écrit par les fonctions Netlify (submit-mandat.js, retract.js) via la service role.
-- INSERT seul : les triggers ci-dessous bloquent TOUT UPDATE/DELETE (même via l'API service),
-- ce qui en fait un journal réellement append-only (preuve non altérable après coup).
-- ============================================================================

create table if not exists public.signature_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),  -- horodatage SERVEUR DB (indépendant du client)
  ref           text        not null,                -- référence dossier
  cert_id       text,                                -- identifiant de certificat
  event         text        not null default 'signed', -- 'signed' | 'retracted'
  signed_at     timestamptz,                          -- horodatage applicatif (côté fonction)
  ip_hash       text,                                 -- IP hachée + salée (RGPD)
  user_agent    text,
  doc_hash      text,                                 -- SHA-256 du document signé (intégrité)
  flight_num    text,
  pax           int,
  passenger_names text,                               -- noms + date de naissance de TOUS les passagers (famille)
  address       text,                                 -- adresse du signataire
  flight_mode   text,                                 -- 'direct' | 'correspondance'
  doc_kind      text,                                 -- (event='document') type : identite | carte-embarquement | contrat-signe-pdf
  doc_filename  text,                                 -- (event='document') nom du fichier déposé
  consent_docs  boolean,                              -- consentement RGPD collecte documents
  start_now     boolean,                              -- exécution immédiate (art. L.221-25)
  source        text,
  lang          text
);

-- Ajout des colonnes sur une table déjà existante (idempotent).
alter table public.signature_events add column if not exists passenger_names text;
alter table public.signature_events add column if not exists address text;
alter table public.signature_events add column if not exists flight_mode text;
alter table public.signature_events add column if not exists doc_kind text;
alter table public.signature_events add column if not exists doc_filename text;

create index if not exists signature_events_ref_idx     on public.signature_events (ref);
create index if not exists signature_events_created_idx  on public.signature_events (created_at);

-- ── Append-only : on interdit toute mutation, y compris via la service role ──
create or replace function public.signature_events_no_mutate()
returns trigger language plpgsql as $$
begin
  raise exception 'signature_events est APPEND-ONLY : % interdit', tg_op;
end;
$$;

drop trigger if exists signature_events_block_update on public.signature_events;
create trigger signature_events_block_update
  before update on public.signature_events
  for each row execute function public.signature_events_no_mutate();

drop trigger if exists signature_events_block_delete on public.signature_events;
create trigger signature_events_block_delete
  before delete on public.signature_events
  for each row execute function public.signature_events_no_mutate();

-- ── RLS : aucun accès via les clés publiques (anon / authenticated). Seule la service
-- role (fonctions Netlify) écrit ; la lecture se fait via le dashboard / SQL admin. ──
alter table public.signature_events enable row level security;
-- (volontairement AUCUNE policy pour anon/authenticated → tout accès public bloqué)
