-- ============================================================================
-- Robin des Airs — Vérifs du journal de preuve (signature_events)
-- À coller dans Supabase → SQL Editor. Requêtes de lecture / contrôle, sans effet de bord.
-- ============================================================================

-- 1) Les 50 derniers événements loggés (ordre anti-chronologique).
select created_at, event, ref, cert_id, flight_num, pax, doc_hash, ip_hash, lang, source
from public.signature_events
order by created_at desc
limit 50;

-- 2) Compte par type d'événement.
select event, count(*) as n
from public.signature_events
group by event
order by n desc;

-- 3) Le dossier de preuve COMPLET d'une référence donnée (remplace 'REF_ICI').
select *
from public.signature_events
where ref = 'REF_ICI'
order by created_at asc;

-- 4) Contrôle « append-only » : ces 2 requêtes DOIVENT échouer avec
--    « signature_events est APPEND-ONLY : UPDATE/DELETE interdit ».
--    (Décommente pour tester, puis recommente.)
-- update public.signature_events set ref = 'HACK' where id = 1;
-- delete from public.signature_events where id = 1;

-- 5) Doublons éventuels (même ref + même event signé plusieurs fois) — pour audit.
select ref, event, count(*) as n
from public.signature_events
group by ref, event
having count(*) > 1
order by n desc;
