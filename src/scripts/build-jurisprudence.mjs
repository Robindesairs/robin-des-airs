// Génère jurisprudence-ce261.html à partir de src/data/ce261-jurisprudence.json
// Usage : node src/scripts/build-jurisprudence.mjs
// (édite le JSON pour ajouter/corriger un arrêt, puis relance ce script)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DATA = resolve(ROOT, 'src', 'data', 'ce261-jurisprudence.json');
const OUT = resolve(ROOT, 'jurisprudence-ce261.html');

const cases = JSON.parse(readFileSync(DATA, 'utf8'));

// Ordre pédagogique des thèmes
const THEME_ORDER = [
  'Droit à indemnisation',
  'Circonstances extraordinaires',
  'Mesures raisonnables',
  'Obligation de prise en charge',
  'Vols avec correspondance',
  "Refus d'embarquement / surclassement",
  "Champ d'application & transporteur effectif",
  'Transporteur effectif',
  'Compétence juridictionnelle',
  'Cession de créance',
  'Information & preuve',
  'Procédure & preuve (France)',
  'Prescription',
  'Éligibilité',
];
const themeRank = (t) => {
  const i = THEME_ORDER.indexOf(t);
  return i === -1 ? 999 : i;
};

const nCJUE = cases.filter((c) => c.juridiction === 'CJUE').length;
const nFR = cases.length - nCJUE;
const nConfirmer = cases.filter((c) => c.confiance === 'à confirmer').length;
const themes = [...new Set(cases.map((c) => c.theme))].sort((a, b) => themeRank(a) - themeRank(b));
const dateMin = cases.reduce((m, c) => (c.date < m ? c.date : m), '9999');
const dateMax = cases.reduce((m, c) => (c.date > m ? c.date : m), '0000');
const yMin = dateMin.slice(0, 4);
const yMax = dateMax.slice(0, 4);

const DATA_JSON = JSON.stringify(cases).replace(/</g, '\\u003c');
const THEME_JSON = JSON.stringify(themes).replace(/</g, '\\u003c');
const today = new Date().toISOString?.() ? null : null; // (Date interdit dans certains contextes) — date statique ci-dessous

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Codex CE261 — Jurisprudence du Règlement (CE) 261/2004</title>
<style>
  :root{
    --bg:#f6f7f5; --panel:#ffffff; --ink:#13211b; --muted:#5b6b62; --line:#e4e8e3;
    --green:#00935b; --green-bright:#00c87a; --green-soft:#e6f6ee;
    --cjue:#0a5b8c; --cjue-soft:#e6f0f7; --fr:#7a4bcc; --fr-soft:#efe9fb;
    --warn:#b4690e; --warn-soft:#fbf0df; --su:#0f7a3d; --su-soft:#e3f5ea;
    --radius:14px; --shadow:0 1px 2px rgba(17,33,27,.05),0 8px 24px rgba(17,33,27,.06);
    --maxw:1080px;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"Inter",sans-serif;
    line-height:1.55;font-size:16px;-webkit-font-smoothing:antialiased}
  a{color:var(--green)}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 20px}

  /* Header */
  header.top{background:linear-gradient(180deg,#0f3326,#0b271d);color:#eafaf2;padding:34px 0 30px}
  header.top .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7fd9ad;font-weight:600}
  header.top h1{margin:.35em 0 .15em;font-size:30px;line-height:1.15;letter-spacing:-.01em}
  header.top p.sub{margin:0;color:#bfe6d3;max-width:62ch;font-size:15px}
  .statline{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
  .stat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:999px;
    padding:6px 13px;font-size:13px;color:#eafaf2}
  .stat b{color:#fff}
  .stat .dot{color:var(--green-bright)}

  /* Primer */
  .primer{margin:22px 0 6px}
  .primer .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  .pcard{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow)}
  .pcard h3{margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
  .pcard p{margin:0;font-size:14px;color:var(--ink)}
  .pcard .big{font-size:15px;font-weight:600}
  .pcard ul{margin:6px 0 0;padding-left:18px;font-size:14px}
  .pcard li{margin:2px 0}

  /* Toolbar */
  .toolbar{position:sticky;top:0;z-index:30;background:rgba(246,247,245,.92);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line);padding:12px 0;margin-top:18px}
  .toolrow{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  .search{flex:1 1 260px;display:flex;align-items:center;gap:8px;background:var(--panel);
    border:1px solid var(--line);border-radius:10px;padding:9px 12px}
  .search input{border:0;outline:0;width:100%;font-size:15px;background:transparent;color:var(--ink)}
  .search svg{flex:none;opacity:.5}
  .seg{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .seg button{border:0;background:transparent;padding:9px 14px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer}
  .seg button.on{background:var(--green);color:#fff}
  .btn{border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:9px 13px;font-size:13px;
    font-weight:600;color:var(--ink);cursor:pointer}
  .btn:hover{border-color:#cfd6cf}
  .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}
  .chip{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 12px;font-size:13px;
    color:var(--muted);cursor:pointer;white-space:nowrap}
  .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .chip .c{opacity:.6;margin-left:5px;font-variant-numeric:tabular-nums}

  /* Section + cards */
  main{padding:22px 0 60px}
  .resultmeta{font-size:13px;color:var(--muted);margin:4px 0 16px}
  .themehead{display:flex;align-items:baseline;gap:10px;margin:26px 0 10px;padding-top:6px}
  .themehead h2{margin:0;font-size:19px;letter-spacing:-.01em}
  .themehead .count{font-size:13px;color:var(--muted)}
  .themehead::after{content:"";flex:1;height:1px;background:var(--line)}

  .case{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
    box-shadow:var(--shadow);margin:10px 0;overflow:hidden}
  .case .head{display:flex;gap:13px;align-items:flex-start;padding:14px 16px;cursor:pointer}
  .case .num{flex:none;width:30px;height:30px;border-radius:8px;background:var(--green-soft);color:var(--green);
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}
  .case.is-su .num{background:var(--su-soft);color:var(--su)}
  .case .htext{flex:1;min-width:0}
  .case .nom{font-weight:650;font-size:16px;letter-spacing:-.005em}
  .case .ref{font-size:13px;color:var(--muted);margin-top:1px}
  .case .badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .b{font-size:11.5px;font-weight:600;border-radius:6px;padding:2px 8px;letter-spacing:.02em}
  .b.jur-cjue{background:var(--cjue-soft);color:var(--cjue)}
  .b.jur-fr{background:var(--fr-soft);color:var(--fr)}
  .b.theme{background:#eef1ee;color:#4a5a51}
  .b.warn{background:var(--warn-soft);color:var(--warn)}
  .b.su{background:var(--su-soft);color:var(--su)}
  .case .chev{flex:none;color:var(--muted);transition:transform .18s ease;margin-top:4px}
  .case.open .chev{transform:rotate(90deg)}
  .case .body{display:none;padding:2px 16px 16px;border-top:1px solid var(--line)}
  .case.open .body{display:block}
  .case .body .tags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
  .tag{font-size:11px;color:var(--muted);background:#f1f3f0;border-radius:5px;padding:1px 7px}
  .sec{margin-top:13px}
  .sec .lab{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
  .sec.q .lab{color:var(--cjue)}
  .sec.d .lab{color:var(--ink)}
  .sec.robin{background:var(--green-soft);border:1px solid #c9ecda;border-radius:10px;padding:10px 12px;margin-top:14px}
  .sec.robin .lab{color:var(--green)}
  .sec p{margin:0;font-size:14.5px}
  .srcrow{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:13px}
  .srcrow a{word-break:break-all}
  .markbtns{display:flex;gap:8px;margin-left:auto}
  .markbtns button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:5px 11px;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--muted)}
  .markbtns button.act-su.on{background:var(--su);border-color:var(--su);color:#fff}
  .markbtns button.act-revoir.on{background:var(--warn);border-color:var(--warn);color:#fff}

  /* Révision (flashcards) */
  #revision{display:none}
  body.mode-revision #lecture{display:none}
  body.mode-revision #revision{display:block}
  .rev-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:6px 0 14px}
  .progress{flex:1 1 200px;height:10px;background:#e7ebe7;border-radius:999px;overflow:hidden}
  .progress > i{display:block;height:100%;background:var(--green-bright);width:0;transition:width .25s ease}
  .rev-meta{font-size:13px;color:var(--muted)}
  .flash{background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);
    padding:26px 24px;min-height:300px;display:flex;flex-direction:column}
  .flash .top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}
  .flash .fnom{font-size:22px;font-weight:680;letter-spacing:-.01em;margin:2px 0}
  .flash .fref{color:var(--muted);font-size:14px}
  .flash .fq{margin-top:16px;font-size:17px;line-height:1.5}
  .flash .reveal{margin-top:18px;display:none}
  .flash.revealed .reveal{display:block}
  .flash .hintbtn{margin-top:auto;align-self:flex-start}
  .flash .reveal .sec p{font-size:15px}
  .rev-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
  .rev-actions button{flex:1 1 130px;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:680;cursor:pointer}
  .a-reveal{background:var(--ink);color:#fff}
  .a-su{background:var(--su);color:#fff}
  .a-revoir{background:var(--warn);color:#fff}
  .a-skip{background:#eef1ee;color:var(--ink)}
  .rev-empty{text-align:center;color:var(--muted);padding:50px 10px}
  .rev-empty .big{font-size:18px;color:var(--ink);font-weight:650;margin-bottom:6px}
  .filterbtns{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted)}
  .filterbtns label{display:inline-flex;align-items:center;gap:6px;cursor:pointer}

  footer{border-top:1px solid var(--line);padding:24px 0 50px;color:var(--muted);font-size:13px}
  footer .disc{background:var(--warn-soft);border:1px solid #f0dcb6;border-radius:10px;padding:12px 14px;color:#6a4408;margin-bottom:14px}

  @media (max-width:600px){
    header.top h1{font-size:24px}
    .case .head{padding:13px}
    .flash{padding:20px 16px}
  }

  /* Impression = livre */
  @media print{
    .toolbar,.markbtns,.chev,#revision,.no-print{display:none !important}
    body{background:#fff;font-size:11.5pt}
    header.top{background:#fff;color:#000;border-bottom:2px solid #000;padding:0 0 14px}
    header.top .eyebrow,header.top p.sub{color:#333}
    header.top h1{color:#000}
    .stat{background:#f0f0f0;color:#000;border-color:#ccc}
    .case{box-shadow:none;break-inside:avoid;border-color:#bbb}
    .case .body{display:block !important}
    .case{page-break-inside:avoid}
    .sec.robin{background:#f3f3f3;border-color:#ccc}
    a{color:#000;text-decoration:none}
    .themehead{break-after:avoid}
  }
</style>
</head>
<body class="mode-lecture">
<header class="top">
  <div class="wrap">
    <div class="eyebrow">Robin des Airs — Recueil interne</div>
    <h1>Codex CE261 · Jurisprudence du Règlement (CE) n° 261/2004</h1>
    <p class="sub">Les ${cases.length} décisions clés à connaître pour défendre un dossier d'indemnisation — CJUE et juridictions françaises. Au-delà du texte du règlement : ce que les juges ont réellement tranché, et comment s'en servir.</p>
    <div class="statline">
      <span class="stat"><b>${cases.length}</b> arrêts</span>
      <span class="stat"><span class="dot">●</span> <b>${nCJUE}</b> CJUE</span>
      <span class="stat"><span class="dot">●</span> <b>${nFR}</b> France</span>
      <span class="stat">${yMin}–${yMax}</span>
      <span class="stat" id="stat-su">Su : <b>0</b></span>
      <span class="stat" id="stat-revoir">À revoir : <b>0</b></span>
    </div>
  </div>
</header>

<div class="wrap primer">
  <div class="grid">
    <div class="pcard">
      <h3>Les montants (art. 7)</h3>
      <p class="big">250 € · 400 € · 600 €</p>
      <p style="color:var(--muted);font-size:13px;margin-top:4px">≤ 1500 km · 1500–3500 km (ou intra-UE &gt;1500) · &gt; 3500 km. Distance orthodromique départ→arrivée finale.</p>
    </div>
    <div class="pcard">
      <h3>Le seuil</h3>
      <p class="big">Retard ≥ 3 h à l'arrivée</p>
      <p style="color:var(--muted);font-size:13px;margin-top:4px">À la <b>destination finale</b>, mesuré à l'<b>ouverture des portes</b>. Annulation et refus d'embarquement aussi.</p>
    </div>
    <div class="pcard">
      <h3>L'échappatoire (art. 5 §3)</h3>
      <p>« Circonstances extraordinaires » + « toutes mesures raisonnables » — <b>double preuve à la charge de la compagnie</b>, interprétation stricte.</p>
    </div>
    <div class="pcard">
      <h3>Réflexes Robin</h3>
      <ul>
        <li>Prescription <b>5 ans</b> (France)</li>
        <li>Clause de cession <b>inopposable</b></li>
        <li>For : départ <b>ou</b> arrivée</li>
        <li>Assistance (art. 9) due <b>même</b> en circ. extra.</li>
      </ul>
    </div>
  </div>
</div>

<div class="toolbar no-print">
  <div class="wrap">
    <div class="toolrow">
      <div class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="Rechercher : grève, panne, correspondance, cession, prescription, n° d'affaire…" autocomplete="off" />
      </div>
      <div class="seg" id="jurseg">
        <button data-jur="all" class="on">Tout</button>
        <button data-jur="CJUE">CJUE</button>
        <button data-jur="FR">France</button>
      </div>
      <div class="seg" id="modeseg">
        <button data-mode="lecture" class="on">Lecture</button>
        <button data-mode="revision">Révision</button>
      </div>
      <button class="btn" id="expandbtn">Tout déplier</button>
      <button class="btn" id="printbtn">Imprimer / PDF</button>
    </div>
    <div class="chips" id="themechips"></div>
  </div>
</div>

<main>
  <div class="wrap">
    <div id="lecture">
      <div class="resultmeta" id="resultmeta"></div>
      <div id="list"></div>
    </div>

    <div id="revision">
      <div class="rev-bar">
        <div class="progress"><i id="progfill"></i></div>
        <div class="rev-meta" id="revmeta"></div>
        <div class="filterbtns">
          <label><input type="checkbox" id="onlyunknown" /> non maîtrisés seulement</label>
          <button class="btn" id="resetprog">Réinitialiser</button>
        </div>
      </div>
      <div id="flashwrap"></div>
    </div>
  </div>
</main>

<footer>
  <div class="wrap">
    <div class="disc">⚠️ Recueil pédagogique interne. Les fiches « à confirmer » (badge orange) doivent être revérifiées sur curia.europa.eu / Légifrance avant toute citation en justice. Vérifier la jurisprudence la plus récente avant chaque procédure.</div>
    Codex CE261 — généré pour Robin des Airs · ${cases.length} arrêts (${nConfirmer} à confirmer) · sources : curia.europa.eu, eur-lex.europa.eu, Légifrance, Juricaf.
    Mettre à jour : éditer <code>src/data/ce261-jurisprudence.json</code> puis <code>node src/scripts/build-jurisprudence.mjs</code>.
  </div>
</footer>

<script>
const CASES = ${DATA_JSON};
const THEMES = ${THEME_JSON};
const STORE_KEY = 'rda-ce261-progress-v1';
let progress = {};
try { progress = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e){ progress = {}; }
const saveProg = () => { try{ localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }catch(e){} };

const state = { q:'', jur:'all', theme:'all', mode:'lecture', onlyUnknown:false, revIndex:0 };

const norm = (s) => (s||'').toString().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
const isFR = (c) => c.juridiction !== 'CJUE';

function searchText(c){
  return norm([c.nom,c.ref,c.theme,(c.tags||[]).join(' '),c.question,c.decision,c.portee,c.robin].join(' '));
}

function filtered(){
  const q = norm(state.q);
  return CASES.filter(c => {
    if(state.jur==='CJUE' && isFR(c)) return false;
    if(state.jur==='FR' && !isFR(c)) return false;
    if(state.theme!=='all' && c.theme!==state.theme) return false;
    if(q && !searchText(c).includes(q)) return false;
    return true;
  });
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function badge(c){
  const jur = isFR(c)
    ? '<span class="b jur-fr">'+esc(c.juridiction)+'</span>'
    : '<span class="b jur-cjue">CJUE</span>';
  const warn = c.confiance==='à confirmer' ? '<span class="b warn">à confirmer</span>' : '';
  const su = progress[c.id]==='su' ? '<span class="b su">✓ su</span>' : '';
  return jur + '<span class="b theme">'+esc(c.theme)+'</span>' + warn + su;
}

function caseHTML(c){
  const tags = (c.tags||[]).map(t=>'<span class="tag">#'+esc(t)+'</span>').join('');
  const open = c.confiance && false; // collapsed par défaut
  return '<article class="case'+(progress[c.id]==='su'?' is-su':'')+'" data-id="'+c.id+'">'
    + '<div class="head" data-toggle>'
      + '<div class="num">'+c.n+'</div>'
      + '<div class="htext"><div class="nom">'+esc(c.nom)+'</div>'
        + '<div class="ref">'+esc(c.ref)+'</div>'
        + '<div class="badges">'+badge(c)+'</div></div>'
      + '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>'
    + '</div>'
    + '<div class="body">'
      + '<div class="tags">'+tags+'</div>'
      + '<div class="sec q"><div class="lab">La question</div><p>'+esc(c.question)+'</p></div>'
      + '<div class="sec d"><div class="lab">Ce que la Cour a jugé</div><p>'+esc(c.decision)+'</p></div>'
      + '<div class="sec"><div class="lab">Portée</div><p>'+esc(c.portee)+'</p></div>'
      + '<div class="sec robin"><div class="lab">Pour Robin des Airs</div><p>'+esc(c.robin)+'</p></div>'
      + '<div class="srcrow"><a href="'+esc(c.source)+'" target="_blank" rel="noopener">Source ↗</a>'
        + '<div class="markbtns no-print">'
          + '<button class="act-su'+(progress[c.id]==='su'?' on':'')+'" data-mark="su">✓ Su</button>'
          + '<button class="act-revoir'+(progress[c.id]==='revoir'?' on':'')+'" data-mark="revoir">À revoir</button>'
        + '</div></div>'
    + '</div></article>';
}

function renderLecture(){
  const list = document.getElementById('list');
  const data = filtered();
  document.getElementById('resultmeta').textContent =
    data.length + ' arrêt' + (data.length>1?'s':'') + (state.theme!=='all'? ' · '+state.theme : '') ;
  const byTheme = {};
  for(const c of data){ (byTheme[c.theme]=byTheme[c.theme]||[]).push(c); }
  const order = THEMES.filter(t=>byTheme[t]);
  let html='';
  for(const t of order){
    html += '<div class="themehead"><h2>'+esc(t)+'</h2><span class="count">'+byTheme[t].length+'</span></div>';
    html += byTheme[t].map(caseHTML).join('');
  }
  if(!data.length) html = '<div class="rev-empty"><div class="big">Aucun arrêt</div>Élargissez la recherche ou les filtres.</div>';
  list.innerHTML = html;
}

function updateStats(){
  const su = Object.values(progress).filter(v=>v==='su').length;
  const rev = Object.values(progress).filter(v=>v==='revoir').length;
  document.querySelector('#stat-su b').textContent = su;
  document.querySelector('#stat-revoir b').textContent = rev;
}

function renderChips(){
  const counts={}; CASES.forEach(c=>counts[c.theme]=(counts[c.theme]||0)+1);
  const chips = ['<span class="chip'+(state.theme==='all'?' on':'')+'" data-theme="all">Tous les thèmes<span class="c">'+CASES.length+'</span></span>']
    .concat(THEMES.map(t=>'<span class="chip'+(state.theme===t?' on':'')+'" data-theme="'+esc(t)+'">'+esc(t)+'<span class="c">'+counts[t]+'</span></span>'));
  document.getElementById('themechips').innerHTML = chips.join('');
}

/* ---- Révision (flashcards) ---- */
function revDeck(){
  let d = filtered();
  if(state.onlyUnknown) d = d.filter(c=>progress[c.id]!=='su');
  return d;
}
function renderRevision(){
  const deck = revDeck();
  const wrap = document.getElementById('flashwrap');
  const total = filtered().length;
  const su = filtered().filter(c=>progress[c.id]==='su').length;
  document.getElementById('progfill').style.width = total? (su/total*100)+'%' : '0%';
  document.getElementById('revmeta').textContent = su+' / '+total+' maîtrisés';
  if(!deck.length){
    wrap.innerHTML = '<div class="rev-empty"><div class="big">🎓 Rien à réviser ici</div>'
      + (total? 'Tout est marqué « su » pour ce filtre. Décochez « non maîtrisés seulement » ou changez de thème.' : 'Aucun arrêt ne correspond aux filtres.')+'</div>';
    return;
  }
  if(state.revIndex>=deck.length) state.revIndex=0;
  const c = deck[state.revIndex];
  wrap.innerHTML = '<div class="flash" id="flash">'
    + '<div class="top">'+badge(c)+'</div>'
    + '<div class="fnom">'+c.n+'. '+esc(c.nom)+'</div>'
    + '<div class="fref">'+esc(c.ref)+'</div>'
    + '<div class="fq">'+esc(c.question)+'</div>'
    + '<div class="reveal">'
      + '<div class="sec d"><div class="lab">Décision</div><p>'+esc(c.decision)+'</p></div>'
      + '<div class="sec"><div class="lab">Portée</div><p>'+esc(c.portee)+'</p></div>'
      + '<div class="sec robin"><div class="lab">Pour Robin des Airs</div><p>'+esc(c.robin)+'</p></div>'
      + '<div class="srcrow"><a href="'+esc(c.source)+'" target="_blank" rel="noopener">Source ↗</a></div>'
    + '</div>'
    + '<div class="rev-actions" id="revactions">'
      + '<button class="a-reveal" data-act="reveal">Révéler la réponse</button>'
    + '</div></div>';
}
function showAnswerButtons(){
  document.getElementById('flash').classList.add('revealed');
  document.getElementById('revactions').innerHTML =
      '<button class="a-su" data-act="su">✓ Je sais</button>'
    + '<button class="a-revoir" data-act="revoir">À revoir</button>'
    + '<button class="a-skip" data-act="skip">Passer →</button>';
}
function advance(){
  const deck = revDeck();
  state.revIndex = (state.revIndex+1);
  if(state.revIndex>=deck.length) state.revIndex=0;
  renderRevision();
}

/* ---- Events ---- */
document.addEventListener('click', (e)=>{
  const tgl = e.target.closest('[data-toggle]');
  if(tgl){ tgl.parentElement.classList.toggle('open'); return; }

  const mark = e.target.closest('[data-mark]');
  if(mark){
    e.stopPropagation();
    const art = mark.closest('.case'); const id = art.dataset.id; const v = mark.dataset.mark;
    progress[id] = (progress[id]===v) ? undefined : v;
    if(progress[id]===undefined) delete progress[id];
    saveProg(); updateStats();
    art.classList.toggle('is-su', progress[id]==='su');
    art.querySelectorAll('[data-mark]').forEach(b=>b.classList.toggle('on', progress[id]===b.dataset.mark));
    return;
  }

  const chip = e.target.closest('[data-theme]');
  if(chip){ state.theme = chip.dataset.theme; state.revIndex=0; renderChips(); rerender(); return; }

  const jb = e.target.closest('#jurseg button');
  if(jb){ state.jur=jb.dataset.jur; document.querySelectorAll('#jurseg button').forEach(b=>b.classList.toggle('on',b===jb)); state.revIndex=0; rerender(); return; }

  const mb = e.target.closest('#modeseg button');
  if(mb){ state.mode=mb.dataset.mode; document.querySelectorAll('#modeseg button').forEach(b=>b.classList.toggle('on',b===mb));
    document.body.className='mode-'+state.mode; rerender(); return; }

  const act = e.target.closest('[data-act]');
  if(act){
    const a=act.dataset.act;
    if(a==='reveal'){ showAnswerButtons(); return; }
    const deck=revDeck(); const c=deck[state.revIndex];
    if(a==='su'||a==='revoir'){ progress[c.id]=a; saveProg(); updateStats(); }
    advance(); return;
  }
});
document.getElementById('q').addEventListener('input', (e)=>{ state.q=e.target.value; state.revIndex=0; rerender(); });
document.getElementById('expandbtn').addEventListener('click', ()=>{
  const cards=[...document.querySelectorAll('.case')];
  const anyClosed=cards.some(c=>!c.classList.contains('open'));
  cards.forEach(c=>c.classList.toggle('open',anyClosed));
  document.getElementById('expandbtn').textContent = anyClosed?'Tout replier':'Tout déplier';
});
document.getElementById('printbtn').addEventListener('click', ()=>{ document.querySelectorAll('.case').forEach(c=>c.classList.add('open')); window.print(); });
document.getElementById('onlyunknown').addEventListener('change',(e)=>{ state.onlyUnknown=e.target.checked; state.revIndex=0; renderRevision(); });
document.getElementById('resetprog').addEventListener('click', ()=>{
  if(confirm('Réinitialiser toute votre progression (su / à revoir) ?')){ progress={}; saveProg(); updateStats(); rerender(); }
});

function rerender(){ if(state.mode==='lecture') renderLecture(); else renderRevision(); }

renderChips(); updateStats(); renderLecture();
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log('Écrit : ' + OUT + ' (' + cases.length + ' arrêts)');
