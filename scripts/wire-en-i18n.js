#!/usr/bin/env node
/**
 * wire-en-i18n.js — Câble les chaînes FR « en dur » de l'accueil dans le système i18n.
 *
 * Contexte : l'accueil (index.html) n'était internationalisé qu'à moitié — le
 * simulateur, des bouts du résultat, du parrainage et du pied de page étaient
 * codés en français en dur (jamais marqués data-i18n), donc restaient FR sur /en.
 *
 * Ce script (migration REJOUABLE, idempotente) :
 *   1) ajoute data-i18n / data-i18n-html aux éléments concernés dans index.html ;
 *   2) ajoute la clé correspondante (FR = texte actuel, EN = traduction) dans les
 *      deux dictionnaires de i18n.js.
 * Le FR à l'écran reste IDENTIQUE (apply() réinjecte la valeur FR du dico).
 * Ensuite, `node scripts/build-en-home.js` régénère index-en.html (anglais figé).
 *
 *   Usage :  node scripts/wire-en-i18n.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const I18N = path.join(ROOT, 'i18n.js');

/* Chaque entrée : { key, attr, fr, en, et un sélecteur : find | openTag | re }
 *  - find    : élément complet sur une ligne → on insère l'attribut avant le 1er '>'
 *  - openTag : balise ouvrante unique (élément multi-lignes) → idem
 *  - re      : RegExp à 3 groupes (ouvrant sans '>', contenu, fermante) pour les doublons
 *  attr = 'i18n' (texte) ou 'i18n-html' (HTML interne). */
const E = [
  // ── Hero : démo WhatsApp ──
  { key:'wa_online', attr:'i18n', find:'<span class="wa-typedemo-online">● en ligne</span>',
    fr:'● en ligne', en:'● online' },
  { key:'hero_wa_demo_foot', attr:'i18n', find:'<span class="wa-typedemo-meta wa-chatdemo-foot">On parle votre langue · réponse en quelques minutes →</span>',
    fr:'On parle votre langue · réponse en quelques minutes →', en:'We speak your language · reply in minutes →' },
  { key:'hero_wa_demo_sr', attr:'i18n', find:'<span class="sr-only">Exemple de conversation WhatsApp : vous envoyez votre numéro de vol puis une photo de votre carte d\'embarquement ; Robin lit le vol, confirme l\'éligibilité et l\'indemnité — jusqu\'à 600 € par passager. Robin précise sa commission de 25 % au succès seulement (0 € si on ne gagne pas, aucune avance), son expertise des vols Europe–Afrique (Dakar, Abidjan, Bamako) et qu\'il répond en wolof, bambara, lingala ou français.</span>',
    fr:'Exemple de conversation WhatsApp : vous envoyez votre numéro de vol puis une photo de votre carte d\'embarquement ; Robin lit le vol, confirme l\'éligibilité et l\'indemnité — jusqu\'à 600 € par passager. Robin précise sa commission de 25 % au succès seulement (0 € si on ne gagne pas, aucune avance), son expertise des vols Europe–Afrique (Dakar, Abidjan, Bamako) et qu\'il répond en wolof, bambara, lingala ou français.',
    en:'Example of a WhatsApp conversation: you send your flight number then a photo of your boarding pass; Robin reads the flight, confirms eligibility and the amount — up to €600 per passenger. Robin notes the 25% success fee only (€0 if we don\'t win, no upfront cost), expertise on Europe–Africa flights (Dakar, Abidjan, Bamako) and that he replies in Wolof, Bambara, Lingala or French.' },

  // ── Étape 1 : indice ──
  { key:'step1_hint', attr:'i18n', find:'<p class="funnel-hint">Pas de souci si vous ne vous souvenez plus des détails — on vérifie pour vous.</p>',
    fr:'Pas de souci si vous ne vous souvenez plus des détails — on vérifie pour vous.', en:'No worries if you don\'t remember the details — we\'ll check for you.' },

  // ── Étape 1c : message "je ne sais pas" ──
  { key:'step1c_nesaispas_msg', attr:'i18n', find:'<p class="reason-nesaispas-msg" id="step1c-nesaispas-msg" style="display:none; font-size:11px; color:var(--neon-b); margin-top:10px; font-weight:600;">Pas de souci, on vérifiera les registres météo pour vous.</p>',
    fr:'Pas de souci, on vérifiera les registres météo pour vous.', en:'No worries — we\'ll check the weather records for you.' },

  // ── Étape 1b : préavis ──
  { key:'step1b_eyebrow', attr:'i18n', find:'<div class="fstep-eyebrow">Étape 1b — Délai de prévenance</div>',
    fr:'Étape 1b — Délai de prévenance', en:'Step 1b — Notice period' },
  { key:'step1b_q', attr:'i18n', find:'<p class="fstep-q">Quand avez-vous appris l\'annulation ?</p>',
    fr:'Quand avez-vous appris l\'annulation ?', en:'When did you learn of the cancellation?' },
  { key:'step1b_late_main', attr:'i18n', find:'<span class="cb-main">Moins de 14 jours avant le départ</span>',
    fr:'Moins de 14 jours avant le départ', en:'Less than 14 days before departure' },
  { key:'step1b_late_sub', attr:'i18n', find:'<span class="cb-sub">Annulation tardive → indemnisation pleine ✅</span>',
    fr:'Annulation tardive → indemnisation pleine ✅', en:'Late cancellation → full compensation ✅' },
  { key:'step1b_early_main', attr:'i18n', find:'<span class="cb-main">Plus de 14 jours avant le départ</span>',
    fr:'Plus de 14 jours avant le départ', en:'More than 14 days before departure' },
  { key:'step1b_early_sub', attr:'i18n', find:'<span class="cb-sub">Préavis suffisant — indemnisation probablement non due</span>',
    fr:'Préavis suffisant — indemnisation probablement non due', en:'Enough notice — compensation likely not due' },

  // ── Étape 2 : type de trajet ──
  { key:'step2_eyebrow', attr:'i18n', find:'<div class="fstep-eyebrow">Étape 2 sur 5 — Type de trajet</div>',
    fr:'Étape 2 sur 5 — Type de trajet', en:'Step 2 of 5 — Trip type' },
  { key:'step2_hint', attr:'i18n', find:'<p class="funnel-hint">En quelques minutes, vous savez ce que vous touchez.</p>',
    fr:'En quelques minutes, vous savez ce que vous touchez.', en:'In minutes, you\'ll know what you\'re owed.' },
  { key:'step2_q', attr:'i18n', find:'<p class="fstep-q">Ce voyage était-il direct ou avec correspondance ?</p>',
    fr:'Ce voyage était-il direct ou avec correspondance ?', en:'Was this trip direct or with a connection?' },
  { key:'step2_direct_main', attr:'i18n', find:'<span class="cb-main">Vol direct</span>',
    fr:'Vol direct', en:'Direct flight' },
  { key:'step2_direct_sub', attr:'i18n', find:'<span class="cb-sub">Sans escale</span>',
    fr:'Sans escale', en:'Non-stop' },
  { key:'step2_direct_note', attr:'i18n', find:'<small class="block text-sm text-gray-500 mt-1">Sans escale — calcul simplifié</small>',
    fr:'Sans escale — calcul simplifié', en:'Non-stop — simplified calculation' },
  { key:'step2_escale_main', attr:'i18n', find:'<span class="cb-main">Avec correspondance</span>',
    fr:'Avec correspondance', en:'With a connection' },
  { key:'step2_escale_sub', attr:'i18n', find:'<span class="cb-sub">1 escale ou plus</span>',
    fr:'1 escale ou plus', en:'1 stop or more' },
  { key:'step2_escale_note', attr:'i18n', find:'<small class="block text-sm text-gray-500 mt-1">C\'est le dernier vol qui compte — on explique</small>',
    fr:'C\'est le dernier vol qui compte — on explique', en:'The last flight is what counts — we explain' },

  // ── Étape 3a : vol direct ──
  { key:'step3a_eyebrow', attr:'i18n', find:'<div class="fstep-eyebrow">Étape 3 sur 5 — Détails du vol</div>',
    fr:'Étape 3 sur 5 — Détails du vol', en:'Step 3 of 5 — Flight details' },
  { key:'step3a_hint', attr:'i18n', find:'<p class="calc-robin-hint">Indiquez votre numéro de vol, ou les villes de départ et d\'arrivée.</p>',
    fr:'Indiquez votre numéro de vol, ou les villes de départ et d\'arrivée.', en:'Enter your flight number, or the departure and arrival cities.' },
  { key:'calc_no_flight', attr:'i18n', find:'<button type="button" class="link-no-vol" id="btn-je-ne-trouve-pas-mon-vol">Je ne trouve pas mon vol</button>',
    fr:'Je ne trouve pas mon vol', en:'I can\'t find my flight' },
  { key:'calc_main_flights_title', attr:'i18n', find:'<p class="principaux-vols-title">Principaux vols Air France / Corsair / Air Sénégal (Afrique subsaharienne)</p>',
    fr:'Principaux vols Air France / Corsair / Air Sénégal (Afrique subsaharienne)', en:'Main Air France / Corsair / Air Sénégal flights (sub-Saharan Africa)' },
  { key:'calc_city_search_label', attr:'i18n', find:'<label class="calc-label">Ville de départ et d\'arrivée (recherche : ville ou code IATA)</label>',
    fr:'Ville de départ et d\'arrivée (recherche : ville ou code IATA)', en:'Departure and arrival city (search: city or IATA code)' },
  { key:'calc_guide_help', attr:'i18n-html', openTag:'<p id="funnel-guide-dakar" class="funnel-guide-link" style="display:none; margin-top:8px; font-size:11px;">',
    fr:'Besoin d\'aide ? <a href="/blog/vol-retarde-dakar-paris-indemnite.html" target="_blank" rel="noopener">Lire notre guide sur le vol Paris-Dakar</a>',
    en:'Need help? <a href="/blog/vol-retarde-dakar-paris-indemnite.html" target="_blank" rel="noopener">Read our Paris-Dakar flight guide</a>' },
  { key:'calc_flight_date', attr:'i18n', find:'<label class="calc-label" for="da-date">Date du vol</label>',
    fr:'Date du vol', en:'Flight date' },

  // ── Étape 3b : avec escale ──
  { key:'step3b_eyebrow', attr:'i18n', find:'<div class="fstep-eyebrow">Étape 3 sur 5 — Vos deux vols</div>',
    fr:'Étape 3 sur 5 — Vos deux vols', en:'Step 3 of 5 — Your two flights' },
  { key:'step3b_hint', attr:'i18n', find:'<p class="calc-robin-hint">Robin des Airs : c’est le dernier vol qui détermine l’indemnité.</p>',
    fr:'Robin des Airs : c’est le dernier vol qui détermine l’indemnité.', en:'Robin des Airs: it\'s the last flight that determines the compensation.' },
  { key:'step3b_info', attr:'i18n-html', find:'<span>La loi CE 261 prend la <strong>distance totale</strong> départ (1er vol) → arrivée finale (dernier vol). Le <strong>dernier vol</strong> détermine l\'indemnité.</span>',
    fr:'La loi CE 261 prend la <strong>distance totale</strong> départ (1er vol) → arrivée finale (dernier vol). Le <strong>dernier vol</strong> détermine l\'indemnité.',
    en:'EU 261 uses the <strong>total distance</strong> from departure (1st flight) → final arrival (last flight). The <strong>last flight</strong> determines the compensation.' },
  { key:'calc_vol1_label', attr:'i18n', find:'<div class="calc-field-label-vol">Vol 1 — Premier tronçon</div>',
    fr:'Vol 1 — Premier tronçon', en:'Flight 1 — First leg' },
  { key:'calc_flight_number_opt', attr:'i18n-html', find:'<label class="calc-label" for="eb-vol1">Numéro de vol <span style="color:rgba(255,255,255,0.35);font-size:9px;">optionnel</span></label>',
    fr:'Numéro de vol <span style="color:rgba(255,255,255,0.35);font-size:9px;">optionnel</span>', en:'Flight number <span style="color:rgba(255,255,255,0.35);font-size:9px;">optional</span>' },
  { key:'calc_vol2_label', attr:'i18n-html', find:'<div class="calc-field-label-vol">Vol 2 — Dernier tronçon <span style="color:var(--neon-b);font-size:9px;">CE VOL COMPTE</span></div>',
    fr:'Vol 2 — Dernier tronçon <span style="color:var(--neon-b);font-size:9px;">CE VOL COMPTE</span>', en:'Flight 2 — Last leg <span style="color:var(--neon-b);font-size:9px;">THIS FLIGHT COUNTS</span>' },
  { key:'calc_vol3_label', attr:'i18n', find:'<div class="calc-field-label-vol">Vol 3</div>',
    fr:'Vol 3', en:'Flight 3' },
  { key:'calc_add_vol3', attr:'i18n', find:'<button type="button" class="eb-add-vol-btn" id="eb-add-vol-btn" onclick="toggleEscaleVol3()">+ Ajouter un 3e vol</button>',
    fr:'+ Ajouter un 3e vol', en:'+ Add a 3rd flight' },
  { key:'calc_departure_date', attr:'i18n', find:'<label class="calc-label" for="eb-date">Date de départ</label>',
    fr:'Date de départ', en:'Departure date' },

  // ── Loader ──
  { key:'funnel_almost', attr:'i18n', find:'<p class="funnel-hint">Plus qu\'une étape. Votre résultat arrive.</p>',
    fr:'Plus qu\'une étape. Votre résultat arrive.', en:'One more step. Your result is coming.' },
  { key:'loader_steps', attr:'i18n', find:'<div class="loader-steps" id="loader-steps">Vérification Eurocontrol · Analyse distance · CE 261/2004</div>',
    fr:'Vérification Eurocontrol · Analyse distance · CE 261/2004', en:'Eurocontrol check · Distance analysis · EU 261/2004' },

  // ── Résultat : libellés statiques + encart promesse ──
  { key:'res_raison_label', attr:'i18n', find:'<div style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Raison invoquée par la compagnie :</div>',
    fr:'Raison invoquée par la compagnie :', en:'Reason given by the airline:' },
  { key:'promise_p1', attr:'i18n-html', find:'<li style="margin-bottom:6px;"><strong style="color:rgba(255,255,255,0.9);">25 % seulement, au succès.</strong> Les autres services prennent souvent 35 % à 50 %.</li>',
    fr:'<strong style="color:rgba(255,255,255,0.9);">25 % seulement, au succès.</strong> Les autres services prennent souvent 35 % à 50 %.',
    en:'<strong style="color:rgba(255,255,255,0.9);">25% only, on success.</strong> Other services often take 35% to 50%.' },
  { key:'promise_p2', attr:'i18n-html', find:'<li style="margin-bottom:6px;"><strong style="color:rgba(255,255,255,0.9);">Zéro risque :</strong> aucune avance, aucun frais de dossier. <strong>Si on ne gagne pas, vous ne payez rien.</strong></li>',
    fr:'<strong style="color:rgba(255,255,255,0.9);">Zéro risque :</strong> aucune avance, aucun frais de dossier. <strong>Si on ne gagne pas, vous ne payez rien.</strong>',
    en:'<strong style="color:rgba(255,255,255,0.9);">Zero risk:</strong> no upfront cost, no case fees. <strong>If we don\'t win, you pay nothing.</strong>' },
  { key:'promise_p3', attr:'i18n-html', find:'<li><strong style="color:rgba(255,255,255,0.9);">Accompagnement WhatsApp :</strong> Un suivi humain et direct sans attente téléphonique.</li>',
    fr:'<strong style="color:rgba(255,255,255,0.9);">Accompagnement WhatsApp :</strong> Un suivi humain et direct sans attente téléphonique.',
    en:'<strong style="color:rgba(255,255,255,0.9);">WhatsApp support:</strong> Direct, human follow-up — no phone queues.' },
  { key:'result_free_note', attr:'i18n', find:'<p style="text-align:center;font-size:10px;color:rgba(255,255,255,0.35);margin-top:6px;">Gratuit si on ne gagne pas · Réponse WhatsApp sous 24h</p>',
    fr:'Gratuit si on ne gagne pas · Réponse WhatsApp sous 24h', en:'Free if we don\'t win · WhatsApp reply within 24h' },

  // ── Non éligible ──
  { key:'nope_title', attr:'i18n', find:'<h3 class="nope-title">⚠️ Ce vol ne semble pas éligible à l\'indemnisation</h3>',
    fr:'⚠️ Ce vol ne semble pas éligible à l\'indemnisation', en:'⚠️ This flight doesn\'t appear eligible for compensation' },
  { key:'exit_capture_title', attr:'i18n', find:'<h4 class="exit-capture-title">📩 Vous avez un prochain vol prévu ?</h4>',
    fr:'📩 Vous avez un prochain vol prévu ?', en:'📩 Have an upcoming flight?' },
  { key:'exit_capture_body', attr:'i18n', find:'<p>Laissez votre email — on vous alerte automatiquement si un retard ouvre un droit.</p>',
    fr:'Laissez votre email — on vous alerte automatiquement si un retard ouvre un droit.', en:'Leave your email — we\'ll alert you automatically if a delay creates a right to claim.' },
  { key:'exit_capture_btn', attr:'i18n', find:'<button type="button" class="non-eligible-btn">M\'alerter gratuitement</button>',
    fr:'M\'alerter gratuitement', en:'Alert me for free' },
  { key:'exit_referral_title', attr:'i18n', find:'<h4 class="exit-referral-title">👥 Vous connaissez quelqu\'un dont le vol a été retardé ?</h4>',
    fr:'👥 Vous connaissez quelqu\'un dont le vol a été retardé ?', en:'👥 Know someone whose flight was delayed?' },
  { key:'exit_referral_body', attr:'i18n', find:'<p>Partagez Robin — chaque passager peut toucher jusqu\'à 600€.</p>',
    fr:'Partagez Robin — chaque passager peut toucher jusqu\'à 600€.', en:'Share Robin — each passenger can get up to €600.' },

  // ── Exemples de cas : disclaimer, noms, source ──
  { key:'testi_disclaimer', attr:'i18n-html', openTag:'<div class="testi-disclaimer" style="max-width:840px;margin:14px auto 28px;padding:14px 18px;background:rgba(255,255,255,0.08);border-left:3px solid #F59E0B;border-radius:6px;color:rgba(255,255,255,0.85);font-size:13px;line-height:1.55;text-align:left">',
    fr:'<strong style="color:#F59E0B">ℹ️ Ces exemples sont pédagogiques.</strong> Ils illustrent les indemnités prévues par le règlement européen <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external" style="color:#FED7AA;text-decoration:underline">CE 261/2004</a>. Ils ne constituent pas des avis clients. Robin des Airs est en phase de pré-lancement&nbsp;: les premiers avis vérifiés seront publiés après ouverture officielle du service.',
    en:'<strong style="color:#F59E0B">ℹ️ These examples are illustrative.</strong> They show the compensation set out by European regulation <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external" style="color:#FED7AA;text-decoration:underline">EC 261/2004</a>. They are not customer reviews. Robin des Airs is in pre-launch&nbsp;: the first verified reviews will be published after the service officially opens.' },
  { key:'testi_name_1', attr:'i18n', find:'<div class="testi-name">Cas type — retard long-courrier</div>',
    fr:'Cas type — retard long-courrier', en:'Typical case — long-haul delay' },
  { key:'testi_name_2', attr:'i18n', find:'<div class="testi-name">Cas type — annulation tardive</div>',
    fr:'Cas type — annulation tardive', en:'Typical case — late cancellation' },
  { key:'testi_name_4', attr:'i18n', find:'<div class="testi-name">Cas type — refus de l\'avoir</div>',
    fr:'Cas type — refus de l\'avoir', en:'Typical case — voucher refused' },
  { key:'testi_name_6', attr:'i18n', find:'<div class="testi-name">Cas type — surbooking</div>',
    fr:'Cas type — surbooking', en:'Typical case — overbooking' },
  { key:'testi_name_8', attr:'i18n', find:'<div class="testi-name">Cas type — famille annulation</div>',
    fr:'Cas type — famille annulation', en:'Typical case — family cancellation' },
  { key:'testi_source', attr:'i18n-html', openTag:'<p style="margin-top:18px;font-size:12px;color:rgba(255,255,255,0.55);text-align:center">',
    fr:'Source : <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external" style="color:rgba(255,255,255,0.75);text-decoration:underline">Règlement (CE) n° 261/2004 du Parlement européen et du Conseil</a> · barème articles 4, 5 et 7',
    en:'Source: <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32004R0261" target="_blank" rel="noopener external" style="color:rgba(255,255,255,0.75);text-decoration:underline">Regulation (EC) No 261/2004 of the European Parliament and of the Council</a> · scale articles 4, 5 and 7' },

  // ── Pied de page ──
  { key:'footer_slogan', attr:'i18n-html', find:'<p style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:10px;font-style:italic;">"Robin prend aux compagnies,<br>rend à nos familles."</p>',
    fr:'"Robin prend aux compagnies,<br>rend à nos familles."', en:'"Robin takes from the airlines,<br>gives back to our families."' },
  { key:'footer_guide_heading', attr:'i18n', find:'<h3 class="footer-col-heading">Guide du Voyageur</h3>',
    fr:'Guide du Voyageur', en:'Traveler\'s Guide' },
  { key:'footer_blog', attr:'i18n', find:'<a href="/blog/">Blog — guides et articles</a>',
    fr:'Blog — guides et articles', en:'Blog — guides & articles' },
  { key:'footer_jurisprudence', attr:'i18n', find:'<a href="/blog/jurisprudence-ce261-arrets-cjue.html">Jurisprudence CJUE (CE 261)</a>',
    fr:'Jurisprudence CJUE (CE 261)', en:'CJEU case law (EU 261)' },
  { key:'footer_ce261_summary', attr:'i18n', find:'<a href="/blog/reglementation-ce261-resume.html">Résumé du règlement CE 261</a>',
    fr:'Résumé du règlement CE 261', en:'EU 261 regulation summary' },
  { key:'footer_resources_heading', attr:'i18n', find:'<h3 class="footer-col-heading">Ressources</h3>',
    fr:'Ressources', en:'Resources' },
  { key:'footer_meteo', attr:'i18n', find:'<a href="/meteo-dossier-indemnite.html">Météo et dossier (TAF, METAR…)</a>',
    fr:'Météo et dossier (TAF, METAR…)', en:'Weather & case file (TAF, METAR…)' },
  { key:'footer_why_few', attr:'i18n', find:'<a href="/pourquoi-si-peu-reclament.html">Pourquoi si peu récupèrent leur indemnité ?</a>',
    fr:'Pourquoi si peu récupèrent leur indemnité ?', en:'Why so few claim their compensation?' },
  { key:'footer_ai_docs', attr:'i18n', find:'<a href="/llms.txt">Documentation IA (llms.txt)</a>',
    fr:'Documentation IA (llms.txt)', en:'AI documentation (llms.txt)' },
  { key:'footer_ai_index', attr:'i18n', find:'<a href="/llms-full.txt">Index complet URLs (llms-full.txt)</a>',
    fr:'Index complet URLs (llms-full.txt)', en:'Full URL index (llms-full.txt)' },
  { key:'footer_crm', attr:'i18n', find:'<a href="/crm" rel="nofollow">CRM — accès équipe</a>',
    fr:'CRM — accès équipe', en:'CRM — team access' },
  { key:'footer_cgv', attr:'i18n', find:'<a href="/cgv.html">CGV</a>',
    fr:'CGV', en:'Terms (T&Cs)' },
  { key:'footer_privacy', attr:'i18n', find:'<a href="/politique-confidentialite.html">Politique de confidentialité</a>',
    fr:'Politique de confidentialité', en:'Privacy policy' },
  { key:'footer_mandate', attr:'i18n', find:'<a href="/mandat.html">Mandat de représentation (signer en ligne)</a>',
    fr:'Mandat de représentation (signer en ligne)', en:'Letter of authority (sign online)' },
  { key:'footer_mandat_pdf', attr:'i18n', find:'<a href="/documents/mandat-fr.html?print=1" target="_blank" rel="noopener">Mandat PDF (FR)</a>',
    fr:'Mandat PDF (FR)', en:'Mandate PDF (FR)' },
  { key:'footer_withdrawal', attr:'i18n', find:'<a href="/droit-retractation.html">Droit de rétractation</a>',
    fr:'Droit de rétractation', en:'Right of withdrawal' },
  { key:'footer_track', attr:'i18n', find:'<a href="/suivi-dossier.html">📋 Où en est mon dossier ?</a>',
    fr:'📋 Où en est mon dossier ?', en:'📋 Where\'s my case?' },
  { key:'footer_crisis', attr:'i18n-html', find:'<li class="footer-crisis"><!-- Vérifier que le numéro est actif avant lancement, sinon supprimer --><strong>Ligne crise (plusieurs vols annulés)</strong> — ouverte uniquement en période de crise : <a href="tel:+33189628969">01 89 62 89 69</a></li>',
    fr:'<!-- Vérifier que le numéro est actif avant lancement, sinon supprimer --><strong>Ligne crise (plusieurs vols annulés)</strong> — ouverte uniquement en période de crise : <a href="tel:+33189628969">01 89 62 89 69</a>',
    en:'<strong>Crisis line (multiple cancelled flights)</strong> — open only during a crisis: <a href="tel:+33189628969">01 89 62 89 69</a>' },
  { key:'footer_copyright', attr:'i18n', find:'<div class="footer-legal">© 2026 Robin des Airs — 66 av. des Champs-Élysées, 75008 Paris · Réclamation aérienne · Au service de nos communautés et de nos familles</div>',
    fr:'© 2026 Robin des Airs — 66 av. des Champs-Élysées, 75008 Paris · Réclamation aérienne · Au service de nos communautés et de nos familles',
    en:'© 2026 Robin des Airs — 66 av. des Champs-Élysées, 75008 Paris · Air passenger claims · Serving our communities and our families' },
  { key:'footer_reg', attr:'i18n-html', find:'<div class="footer-reg">Fondé sur le Règlement CE 261/2004<br>Données protégées · RGPD conforme</div>',
    fr:'Fondé sur le Règlement CE 261/2004<br>Données protégées · RGPD conforme', en:'Based on Regulation EU 261/2004<br>Data protected · GDPR compliant' },

  // ── Doublons (mêmes textes à plusieurs endroits) : via RegExp ──
  { key:'funnel_back', attr:'i18n', re:/(<button\b[^>]*?)>(← Retour)(<\/button>)/g,
    fr:'← Retour', en:'← Back' },
  { key:'funnel_restart', attr:'i18n', re:/(<button\b[^>]*?)>(↺ Recommencer le diagnostic)(<\/button>)/g,
    fr:'↺ Recommencer le diagnostic', en:'↺ Start over' },
  { key:'calc_see_amount', attr:'i18n', re:/(<button\b[^>]*?)>(Voir mon indemnité →)(<\/button>)/g,
    fr:'Voir mon indemnité →', en:'See my compensation →' },
  { key:'calc_flight_number', attr:'i18n', re:/(<label\b[^>]*?)>(Numéro de vol)(<\/label>)/g,
    fr:'Numéro de vol', en:'Flight number' },
  { key:'calc_city_from', attr:'i18n', re:/(<label\b[^>]*?)>(Ville de départ)(<\/label>)/g,
    fr:'Ville de départ', en:'Departure city' },
  { key:'calc_city_to', attr:'i18n', re:/(<label\b[^>]*?)>(Ville de fin)(<\/label>)/g,
    fr:'Ville de fin', en:'Arrival city' },
  { key:'calc_passengers', attr:'i18n', re:/(<label\b[^>]*?)>(Passagers)(<\/label>)/g,
    fr:'Passagers', en:'Passengers' },
  { key:'share_whatsapp_btn', attr:'i18n', re:/(<a\b[^>]*class="btn-whatsapp[^>]*?)>(💬 Partager sur WhatsApp)(<\/a>)/g,
    fr:'💬 Partager sur WhatsApp', en:'💬 Share on WhatsApp' },
];

/* ───────── application sur index.html ───────── */
let html = fs.readFileSync(HTML, 'utf8');
const report = [];
const seenKeys = {};

for (const e of E) {
  if (seenKeys[e.key]) { report.push(['DOUBLON-CLÉ', e.key, 0]); continue; }
  seenKeys[e.key] = true;
  const attrStr = ' data-' + e.attr + '="' + e.key + '"';
  let n = 0;

  if (e.re) {
    html = html.replace(e.re, function (m, p1, p2, p3) {
      if (p1.indexOf('data-' + e.attr + '=') > -1) return m; // déjà câblé
      n++; return p1 + attrStr + '>' + p2 + p3;
    });
  } else {
    const target = e.find || e.openTag;
    // insérer l'attribut avant le 1er '>' de la cible
    const injected = target.replace('>', attrStr + '>');
    if (html.indexOf(injected) > -1) {
      n = -1; // déjà présent (idempotent)
    } else {
      let idx = html.indexOf(target);
      while (idx > -1) { n++; idx = html.indexOf(target, idx + target.length); }
      if (n > 0) html = html.split(target).join(injected);
    }
  }
  report.push([e.attr, e.key, n]);
}

/* ───────── insertion des clés dans i18n.js ───────── */
let i18n = fs.readFileSync(I18N, 'utf8');
function block(lang) {
  return E.filter(e => !/^DOUBLON/.test(e.key))
    .map(e => '      ' + e.key + ': ' + JSON.stringify(e[lang]) + ',')
    .join('\n') + '\n';
}
// éviter les doublons si on relance : ne réinsère pas une clé déjà présente
const already = E.filter(e => new RegExp('\\n\\s*' + e.key + ':\\s').test(i18n));
if (already.length === 0) {
  i18n = i18n.replace(/(\n\s*fr: \{\n)/, '$1' + block('fr'));
  i18n = i18n.replace(/(\n\s*en: \{\n)/, '$1' + block('en'));
  fs.writeFileSync(I18N, i18n, 'utf8');
  console.log('✓ i18n.js : ' + E.length + ' clés insérées (fr + en).');
} else {
  console.log('• i18n.js : clés déjà présentes (' + already.length + ') — pas de réinsertion (idempotent).');
}

fs.writeFileSync(HTML, html, 'utf8');

/* ───────── rapport ───────── */
console.log('\n=== Câblage index.html ===');
let ok = 0, dup = 0, miss = 0;
for (const [attr, key, n] of report) {
  if (n === 0) { console.log('  ⚠️  0 match  ' + key + '  (' + attr + ')'); miss++; }
  else if (n === -1) { console.log('  • déjà     ' + key); dup++; }
  else { ok += n; }
}
console.log('  ✓ ' + ok + ' éléments câblés · ' + dup + ' déjà présents · ' + miss + ' NON trouvés');
if (miss) console.log('\n⚠️  Corriger les chaînes « 0 match » (apostrophe ’ vs \', &nbsp;, style exact) puis relancer.');
