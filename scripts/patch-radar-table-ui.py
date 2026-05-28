#!/usr/bin/env python3
"""One-off patch: radar table columns + pub WA."""
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "assets/radar-live.js"
t = p.read_text(encoding="utf-8")

start = "    tbody.innerHTML = rows\n      .map(function (v) {\n        var sensHtml = sensBadge(v.sens);"
end = "      })\n      .join('');\n    renderRadarCards(rows);"
i0 = t.find(start)
i1 = t.find(end)
if i0 < 0 or i1 < 0:
    raise SystemExit("renderRadar block not found")

new_block = r"""    tbody.innerHTML = rows
      .map(function (v) {
        var sensHtml = sensBadge(v.sens);
        var retardHtml = '<span style="color:var(--green);font-weight:700">0h00</span>';
        if (v.statut === 'RETARD') {
          var cls = v.retardMin >= 180 ? 'retard-crit' : v.retardMin >= 60 ? 'retard-warn' : 'retard-ok';
          retardHtml = '<span class="retard-h ' + cls + '">' + retardH(v.retardMin) + '</span>';
        } else if (v.statut === 'ANNULE') {
          retardHtml = '<span style="color:var(--red);font-weight:700">—</span>';
        }
        var prioHtml = '<span class="prio-tag ' + PRIO_CLS[v.prio] + '">' + PRIO_LBL[v.prio] + '</span>';
        var phaseHtml = '<span class="phase ' + (PHASE_CLS[v.phase] || '') + '">' + (PHASE_LBL[v.phase] || v.phase) + '</span>';
        var visuHtml = statusVisuHtml(v);
        var pinned = isVolPinnedToTicker(v);
        var pinHtml =
          '<label class="radar-pin-label" onclick="event.stopPropagation()" title="Bandeau accueil">' +
          '<input type="checkbox" class="radar-pin-cb"' +
          (pinned ? ' checked' : '') +
          ' onchange="window.__radarToggleTickerPin(&quot;' +
          v.id +
          '&quot;, this.checked)"> Bandeau</label>';
        var rowCls = v.prio === 'URGENT' ? (v.statut === 'ANNULE' ? 'row-critical' : 'row-hot') : v.elig === 'OUI' ? 'row-eligible' : '';
        if (pinned) rowCls += ' row-pinned-ticker';
        var track =
          v.trackerUrl && v.trackerUrl !== '#'
            ? '<a class="btn btn-sm" href="' +
              v.trackerUrl +
              '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Suivi</a> '
            : '';
        var immatHtml =
          v.immat && v.immat !== '—'
            ? '<span class="immat">' + v.immat + '</span>'
            : '<span style="color:#9CA3AF;font-size:10px">—</span>';
        return (
          '<tr class="' +
          rowCls +
          '" onclick="window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)"><td style="text-align:center">' +
          pinHtml +
          '</td><td>' +
          prioHtml +
          '</td><td style="font-weight:700;color:var(--navy);font-size:12px">' +
          v.vol +
          '</td><td style="font-size:12px">' +
          v.comp +
          '</td><td>' +
          sensHtml +
          '</td><td><strong>' +
          v.dep +
          '</strong><div style="font-size:10px;color:#9CA3AF">' +
          v.dep_ville +
          '</div></td><td><strong>' +
          v.arr +
          '</strong><div style="font-size:10px;color:#9CA3AF">' +
          v.arr_ville +
          '</div></td><td style="font-family:monospace;font-size:12px;white-space:nowrap">' +
          (v.dateLabel || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          v.std +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.atd || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.sta || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.eta || (v.statut === 'ANNULE' ? '<span style="color:var(--red)">—</span>' : '—')) +
          '</td><td>' +
          retardHtml +
          '</td><td>' +
          phaseHtml +
          '</td><td>' +
          visuHtml +
          '</td><td>' +
          immatHtml +
          '</td><td style="white-space:nowrap">' +
          track +
          '<button class="radar-btn radar-btn-sm" onclick="event.stopPropagation();window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)" title="Détail">🔍</button> ' +
          '<button class="btn-wa radar-btn-sm" onclick="event.stopPropagation();window.__radarOpenPub(&quot;' +
          v.id +
          '&quot;)" title="WhatsApp">💬</button></td></tr>'
        );
      })
      .join('');"""

t = t[:i0] + new_block + t[i1 + len(end) :]
t = t.replace('colspan="15"', 'colspan="14"', 1)

old_pub = """  function openPub(id) {
    currentPubVol = VOLS.find(function (x) { return x.id === id; });
    if (!currentPubVol) return;
    document.getElementById('pub-info').textContent =
      currentPubVol.vol +
      ' — ' +
      currentPubVol.comp +
      ' — ' +
      currentPubVol.dep_ville +
      ' → ' +
      currentPubVol.arr_ville +
      ' · ' +
      (currentPubVol.statut === 'ANNULE' ? 'Annulé' : 'Retard ' + retardH(currentPubVol.retardMin));
    updBudget();
    openModal('modal-pub');
  }"""

new_pub = """  function openPub(id) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    currentPubVol = v;
    var info = document.getElementById('pub-info');
    var preview = document.getElementById('pub-wa-preview');
    if (info) {
      info.textContent =
        v.vol + ' · ' + v.dep + '→' + v.arr + ' · ' + (v.dateLabel || '—') + ' · ' + (v.statut === 'ANNULE' ? 'Annulé' : 'Retard ' + retardH(v.retardMin));
    }
    if (preview) preview.textContent = buildGenericWaPubText(v);
    openModal('modal-pub');
  }"""

if old_pub in t:
    t = t.replace(old_pub, new_pub, 1)

old_lancer = """  function lancerPub() {
    var v = parseInt(document.getElementById('budget-sl').value, 10) || 10;
    var plats = [].slice.call(document.querySelectorAll('.pub-platform.selected')).map(function (e) { return e.dataset.p; }).join(', ');
    if (!plats) {
      alert('Sélectionne au moins une plateforme.');
      return;
    }
    alert(
      '✅ Simulation campagne.\\n\\nVol : ' +
        (currentPubVol && currentPubVol.vol) +
        ' — ' +
        (currentPubVol && currentPubVol.comp) +
        '\\n' +
        (currentPubVol && currentPubVol.dep_ville) +
        ' → ' +
        (currentPubVol && currentPubVol.arr_ville) +
        '\\nBudget : ' +
        v +
        ' €\\nPlateformes : ' +
        plats
    );
    closeModals();
  }"""

new_lancer = """  function lancerPub() {
    if (!currentPubVol) return;
    openGenericWaPub(currentPubVol);
    closeModals();
  }"""

if old_lancer in t:
    t = t.replace(old_lancer, new_lancer, 1)

old_score_box = """      '<div class="info-box"><div class="info-box-title">Score indicatif</div><div style="font-size:26px;font-weight:700;color:' +
      scoreColor(v.score) +
      '">' +
      v.score +
      '/100<div style="margin-top:6px;font-size:11px;font-weight:400;color:#145A32">Robin ne garantit pas le montant — analyse CE 261 sur preuves.</div></div></div>' +
      eligV +"""

new_score_box = """      '<div class="info-box"><div class="info-box-title">Impact</div>' + statusVisuHtml(v) + '</div>' +
      eligV +"""

if old_score_box in t:
    t = t.replace(old_score_box, new_score_box, 1)

if 'Date du vol' not in t:
    t = t.replace(
        "'<div class=\"info-row\"><span class=\"info-label\">N° vol</span><span class=\"info-val\">' +\n      v.vol +",
        "'<div class=\"info-row\"><span class=\"info-label\">Date du vol</span><span class=\"info-val\">' +\n      (v.dateLabel || '—') +\n      '</span></div>' +\n      '<div class=\"info-row\"><span class=\"info-label\">N° vol</span><span class=\"info-val\">' +\n      v.vol +",
        1,
    )
    t = t.replace(
        "'<div class=\"info-row\"><span class=\"info-label\">Départ prévu (Z)</span><span class=\"info-val\">' +\n      v.std +",
        "'<div class=\"info-row\"><span class=\"info-label\">Décollage effectif (Z)</span><span class=\"info-val\">' +\n      (v.atd || '—') +\n      '</span></div>' +\n      '<div class=\"info-row\"><span class=\"info-label\">Départ prévu (Z)</span><span class=\"info-val\">' +\n      v.std +",
        1,
    )

p.write_text(t, encoding="utf-8")
print("patched", p)
