// Assemble contrat.html : style + articles EXACTS extraits de documents/mandat-fr.html
// (aucune retape du texte juridique) + en-tête/bloc données hydraté + script de remplissage.
const fs = require('fs');
const src = fs.readFileSync('documents/mandat-fr.html', 'utf8').split('\n');

// 1-indexé → 0-indexé. Style = 7..226 (contenu entre <style> et </style>). Articles doc-section = 450..721.
const styleInner = src.slice(7, 225).join('\n'); // entre <style>(7) et </style>(226)
const articles   = src.slice(449, 721).join('\n'); // doc-section « Conditions du contrat » (450→721)

const myCss = `
/* ── En-tête + bloc données (contrat rempli) ── */
.c2-head{background:#0B1F3A;color:#fff;padding:22px 30px}
.c2-brand{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:800}
.c2-brand img{width:26px;height:26px;border-radius:6px}
.c2-head h1{margin:14px 0 3px;font-size:21px;font-weight:900;letter-spacing:-.3px}
.c2-head .sub{font-size:13px;color:#9fb2cc}
.c2-head .refline{margin-top:12px;font-size:12px;color:#c3d0e0;font-family:'DM Mono',monospace}
.c2-parties{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e7ecf3}
.c2-party{background:#fff;padding:15px 22px}
.c2-party .k{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#7a879b}
.c2-party .v{font-size:14.5px;font-weight:800;color:#0B1F3A;margin-top:3px;line-height:1.35}
.c2-party .m{font-size:12.5px;color:#7a879b;margin-top:2px;line-height:1.4}
.c2-recap{margin:18px 22px 0;background:#f6f8fb;border:1px solid #e7ecf3;border-radius:12px;padding:4px}
.c2-recap-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#7a879b;padding:11px 14px 6px}
.c2-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e7ecf3;border-radius:9px;overflow:hidden}
.c2-rc{background:#fff;padding:10px 14px}
.c2-rc .k{font-size:10.5px;font-weight:700;text-transform:uppercase;color:#7a879b}
.c2-rc .v{font-size:14px;font-weight:800;color:#0B1F3A;margin-top:2px}
.c2-tbl{margin:10px 4px 4px;border-radius:9px;overflow:hidden;border:1px solid #e7ecf3;font-size:12.5px}
.c2-tbl .tr{display:grid;grid-template-columns:1.5fr 1fr 1.7fr}
.c2-tbl .th{background:#fff;font-weight:800;color:#7a879b;text-transform:uppercase;font-size:10.5px}
.c2-tbl .td{color:#0B1F3A;font-weight:700}
.c2-tbl .tr>span{padding:9px 12px;border-top:1px solid #e7ecf3}
.c2-tbl .th>span{border-top:0}
.c2-note{margin:16px 22px 0;background:#EAF7F1;border:1px solid #BFE6D4;border-radius:11px;padding:12px 14px;font-size:12.5px;color:#2f4c3c;line-height:1.55}
.c2-load{padding:40px 20px;text-align:center;color:#7a879b}
/* ── Acte de cession COURT (le client signe ça ; le détail est aux CGV) ── */
.ac-wrap{padding:6px 30px 24px}
.ac-art{padding:15px 0;border-bottom:1px solid #e7ecf3}
.ac-art:last-child{border-bottom:0}
.ac-art h2{margin:0 0 7px;font-size:14.5px;font-weight:900;color:#0B1F3A;display:flex;gap:8px;align-items:baseline}
.ac-num{font-size:11px;font-weight:800;color:#fff;background:#047857;border-radius:6px;padding:2px 8px;letter-spacing:.02em}
.ac-art p{margin:0 0 6px;font-size:13.5px;line-height:1.62;color:#233247}
.ac-art p:last-child{margin-bottom:0}
.ac-art strong{color:#0B1F3A}
.ac-cgv{display:inline-block;margin-top:8px;font-size:14px;font-weight:800;color:#047857;text-decoration:none;border:1.5px solid #BFE6D4;background:#EAF7F1;border-radius:10px;padding:9px 14px}
`;

const headerHtml = `
<div class="c2-head">
  <div class="c2-brand"><img src="/favicon.png" alt=""> Robin des Airs</div>
  <h1>Acte de cession de créance</h1>
  <div class="sub">Règlement (CE) n° 261/2004 · Articles 1321 et suivants du Code civil</div>
  <div class="refline">Dossier <span id="c-ref">—</span> · établi le <span id="c-etabli">—</span></div>
</div>
<div class="c2-parties">
  <div class="c2-party"><div class="k">Le Cédant</div><div class="v" id="c-cedant">—</div><div class="m" id="c-cedant-addr"></div></div>
  <div class="c2-party"><div class="k">Le Cessionnaire</div><div class="v">Robin des Airs</div><div class="m">SASU en cours d'immatriculation au RCS de Paris<br>Service recouvrement CE 261/2004 · agit en son nom propre<br>66 av. des Champs-Élysées, 75008 Paris<br>contact@robindesairs.eu · +33 7 56 86 36 30</div></div>
</div>
<div class="c2-recap">
  <div class="c2-recap-h">Le dossier, en clair</div>
  <div class="c2-grid">
    <div class="c2-rc"><div class="k">Trajet</div><div class="v" id="c-route">—</div></div>
    <div class="c2-rc"><div class="k">Voyage commençant le</div><div class="v" id="c-tripdate">—</div></div>
    <div class="c2-rc"><div class="k">Vol(s)</div><div class="v" id="c-vols">—</div></div>
    <div class="c2-rc"><div class="k">Réservation</div><div class="v" id="c-pnr">—</div></div>
    <div class="c2-rc"><div class="k">Incident</div><div class="v" id="c-incident">—</div></div>
    <div class="c2-rc"><div class="k">Indemnité visée</div><div class="v" id="c-amount">—</div></div>
  </div>
  <div class="c2-tbl">
    <div class="tr th"><span>Passager</span><span>Naissance</span><span>Adresse / représentant</span></div>
    <div id="c-paxbody"></div>
  </div>
</div>
<div class="c2-note">🔒 Signature électronique certifiée Yousign (horodatage, adresse IP, document scellé, piste d'audit). Chaque cédant adulte signe ; la part d'un passager mineur n'est pas cédée mais recouvrée par mandat spécial (Article 9 bis), le parent/tuteur signant pour lui.</div>
`;

const hydrationJs = `
<script>
(function(){
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function toFr(v){var m=String(v||'').match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);if(m)return ('0'+m[3]).slice(-2)+'/'+('0'+m[2]).slice(-2)+'/'+m[1];return v||'';}
  function toParts(v){var m=String(v||'').match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);if(m)return{d:+m[1],mo:+m[2],y:+m[3]};var i=String(v||'').match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);if(i)return{d:+i[3],mo:+i[2],y:+i[1]};return null;}
  function age(dob,ref){var a=toParts(dob),b=toParts(ref);if(!a||!b)return null;var g=b.y-a.y;if(b.mo<a.mo||(b.mo===a.mo&&b.d<a.d))g--;return g;}
  var ref=(new URLSearchParams(location.search).get('r')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64);
  $('c-ref').textContent=ref||'—';
  $('c-etabli').textContent=new Date().toLocaleDateString('fr-FR');
  document.querySelectorAll('details').forEach(function(x){x.open=true;}); // « lire le contrat » : tout visible
  if(!ref){document.body.insertAdjacentHTML('afterbegin','<p class="c2-load">Lien incomplet.</p>');return;}
  fetch('/api/dossier-get?r='+encodeURIComponent(ref),{credentials:'omit'})
    .then(function(r){if(!r.ok)throw 0;return r.json();})
    .then(function(d){
      var pax=Array.isArray(d.passengers)?d.passengers:[];
      var n=d.pax||pax.length||1;
      var main=(pax[0]&&(pax[0].name||((pax[0].prenom||'')+' '+(pax[0].nom||'')).trim()))||d.name||((d.prenom||'')+' '+(d.nom||'')).trim();
      $('c-cedant').innerHTML=esc(main)+(n>1?' <span style="font-weight:600;color:#7a879b">et '+(n-1)+' co-cédant'+(n-1>1?'s':'')+'</span>':'');
      $('c-cedant-addr').textContent=d.address||(pax[0]&&pax[0].adresse)||'';
      var route=d.route||[d.depAirport,d.arrAirport].filter(Boolean).join(' → ');
      if((!route||route.indexOf('→')<0)&&Array.isArray(d.legs)&&d.legs.length){var pts=[d.legs[0].dep];d.legs.forEach(function(l){pts.push(l.arr);});route=pts.filter(Boolean).join(' → ');}
      $('c-route').textContent=route||'—';
      $('c-tripdate').textContent=toFr(d.date)||d.date||'—';
      var vols=(Array.isArray(d.legs)&&d.legs.length?d.legs.map(function(l){return l.fnum||l.vol;}).filter(Boolean):[]).join(' · ')||d.vol||'—';
      $('c-vols').textContent=vols;
      $('c-pnr').textContent=d.pnr||'—';
      // Motif GÉNÉRIQUE (capture en amont = issue inconnue au moment de la signature). Le motif EXACT
      // (retard/annulation/refus) est affirmé plus tard dans la mise en demeure, pas sur le doc signé.
      $('c-incident').textContent='Irrégularité du vol au sens du Règlement (CE) 261/2004 : retard, annulation ou refus d\\'embarquement';
      var per=parseInt(d.indemnite,10)||600; $('c-amount').textContent='jusqu\\'à '+((per*n).toLocaleString('fr-FR'))+' €';
      var tref=toFr(d.date)||d.date;
      var rows='';
      for(var i=0;i<n;i++){var p=pax[i]||{};var nm=(p.name||((p.prenom||'')+' '+(p.nom||'')).trim())||(i===0?main:'—');var dob=toFr(p.dob);var g=age(p.dob,tref);var minor=g!=null&&g<18;
        var right=minor?('<b>Mineur·e</b> — part non cédée (mandat, art. 9 bis)'+(p.legalRepName?'<br>Représenté·e par '+esc(p.legalRepName):'')):esc(p.adresse||d.address||'');
        rows+='<div class="tr td"><span>'+esc(nm)+(minor?' <span style="color:#9a6a00">· mineur·e</span>':'')+'</span><span>'+esc(dob||'—')+'</span><span>'+right+'</span></div>';}
      $('c-paxbody').innerHTML=rows;
    })
    .catch(function(){document.body.insertAdjacentHTML('afterbegin','<p class="c2-load">😕 Dossier introuvable ou lien expiré. <a href="https://wa.me/33756863630">Reprendre sur WhatsApp</a>.</p>');});
})();
</script>`;

// ACTE DE CESSION COURT (générique, renvoi CGV) — le SEUL document que le client signe.
// Le détail juridique (18 clauses) est dans les CGV, acceptées par la case à cocher.
const acteBody = `
<div class="ac-wrap">
  <div class="ac-art"><h2><span class="ac-num">1</span> Cession</h2>
    <p>Le Cédant cède à Robin des Airs, qui l'accepte, sa créance <strong>née ou à naître</strong> au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire, remboursement, prise en charge), résultant de l'<strong>irrégularité du vol ci-dessus &mdash; retard, annulation ou refus d'embarquement</strong>. Robin des Airs acquiert la créance <strong>en son nom propre et pour son propre compte</strong> (articles 1321 et suivants du Code civil).</p></div>
  <div class="ac-art"><h2><span class="ac-num">2</span> Transfert de propriété et de risque</h2>
    <p>Dès la signature, Robin des Airs est <strong>seul propriétaire</strong> de la créance, l'exerce en son nom, <strong>assume seul l'aléa du recouvrement et l'ensemble des frais</strong> (avocat, huissier, greffe), sans recours contre le Cédant. Le Cédant n'avance et ne supporte <strong>aucun frais</strong>.</p></div>
  <div class="ac-art"><h2><span class="ac-num">3</span> Prix de cession</h2>
    <p>Prix <strong>variable et aléatoire</strong>, indexé sur le montant effectivement recouvré : le Cédant reçoit <strong>75 %</strong> du montant recouvré à l'amiable, <strong>60 %</strong> en cas de recouvrement judiciaire. <strong>Rien récupéré, rien dû.</strong></p></div>
  <div class="ac-art"><h2><span class="ac-num">4</span> Passagers mineurs</h2>
    <p>La part d'un passager mineur n'est pas cédée ; elle est recouvrée par <strong>mandat spécial d'encaissement</strong> (Article 9 bis des CGV), le représentant légal signant pour l'enfant.</p></div>
  <div class="ac-art"><h2><span class="ac-num">5</span> Notification au débiteur</h2>
    <p>La cession est opposable au transporteur par sa <strong>notification</strong>, réalisée par l'envoi d'une copie du présent acte (article 1324 du Code civil) : à compter de sa réception, <strong>seul un paiement effectué à Robin des Airs est libératoire</strong>. Les clauses restreignant la cession des créances CE 261/2004 sont inopposables (CJUE, 29 fév. 2024, C-11/23).</p></div>
  <div class="ac-art"><h2><span class="ac-num">6</span> Conditions Générales</h2>
    <p>Le présent acte est complété par les <strong>Conditions Générales</strong>, que le Cédant déclare avoir lues et acceptées et qui en font <strong>partie intégrante</strong> (exclusivité, correspondances, encaissement, protection des données, litiges&hellip;).</p>
    <a class="ac-cgv" href="/cgv" target="_blank" rel="noopener">Lire les Conditions Générales &rarr;</a></div>
  <div class="ac-art"><h2><span class="ac-num">7</span> Rétractation</h2>
    <p>Le Cédant dispose d'un délai de <strong>14 jours</strong> pour se rétracter, sans frais.</p></div>
</div>`;

const out = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>Acte de cession de créance — Robin des Airs</title>'
  + '<link rel="icon" href="/favicon.png" type="image/png">'
  + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=DM+Mono:wght@500&display=swap" rel="stylesheet">'
  + '<meta name="robots" content="noindex,nofollow">'
  + '<style>' + styleInner + myCss + '</style></head><body>'
  + '<div class="doc" style="max-width:760px;margin:14px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(11,31,58,.05),0 16px 44px rgba(11,31,58,.07)">'
  + headerHtml
  + acteBody
  + '</div>'
  + hydrationJs
  + '</body></html>';

fs.writeFileSync('contrat.html', out);
console.log('contrat.html écrit :', out.length, 'octets');
