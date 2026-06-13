/**
 * Attache UNE pièce (passeport/CNI/titre de séjour, carte d'embarquement, e-billet) aux fiches
 * Airtable du dossier, AU MOMENT DU DÉPÔT — lien sécurisé (par réf) ou WhatsApp (par n°).
 *
 * Téléversement BASE64 direct via l'API « uploadAttachment » d'Airtable : les octets vont de la
 * fonction à Airtable, AUCUNE URL ni secret exposé. Best-effort (n'échoue jamais l'appelant).
 *
 * CRM = 1 ligne par passager → on attache la pièce à TOUTES les fiches de la même réf (apparaît partout).
 * Si aucune fiche n'existe encore (pièce déposée AVANT la signature) → on ne fait rien : elle sera
 * attachée à la signature par submit-mandat (qui balaie toutes les pièces du dossier).
 */

function cfg() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return null;
  return {
    key,
    base: (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim(),
    table: (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim(),
    fRef: (process.env.AIRTABLE_F_REF_DOSSIER || 'flduSWqrqxeNoQkKW').trim(),
    fWa: (process.env.AIRTABLE_F_WHATSAPP || 'fldsFH0PoWe3AV0sI').trim(),
    fPasseport: (process.env.AIRTABLE_F_PIECE_PASSEPORT || 'fldCTsCendE7smLCG').trim(),
    fCarte: (process.env.AIRTABLE_F_PIECE_CARTE || 'flddIxlejoKprr2Ok').trim(),
  };
}

const escFormula = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Type de pièce → champ Airtable. Certificat / frais : pas de champ dédié → null (restent dans Blobs).
function fieldForKind(kind, c) {
  const k = String(kind || '').toLowerCase();
  if (/identite|passeport|cni|passport|sejour/.test(k)) return c.fPasseport;
  if (/carte|boarding|ebillet|ebooking|billet|voyage/.test(k)) return c.fCarte;
  return null;
}

async function attachPieceToDossier({ buf, mime, kind, ref, phone }) {
  try {
    const c = cfg();
    if (!c || !buf || !buf.length || buf.length > 3500000) return { skipped: true };
    const field = fieldForKind(kind, c);
    if (!field) return { skipped: true, reason: 'type sans champ dédié' };

    let formula = '';
    if (ref) formula = `{${c.fRef}}='${escFormula(ref)}'`;
    else if (phone) formula = `{${c.fWa}}='${escFormula(String(phone).replace(/\D/g, ''))}'`;
    else return { skipped: true, reason: 'ni réf ni n°' };

    const findUrl = `https://api.airtable.com/v0/${c.base}/${c.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20&${encodeURIComponent('fields[]')}=${c.fRef}`;
    const fr = await fetch(findUrl, { headers: { Authorization: `Bearer ${c.key}` } });
    if (!fr.ok) return { skipped: true, reason: `find ${fr.status}` };
    const recs = ((await fr.json()).records) || [];
    if (!recs.length) return { skipped: true, reason: 'fiche absente (dépôt avant signature ?)' };

    const refForName = ref || (recs[0].fields && recs[0].fields[c.fRef]) || '';
    const code = String(refForName).replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || 'XXXX';
    const ext = ((mime === 'application/pdf' ? 'pdf' : ((mime || '').split('/')[1] || 'jpg')).replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase()) || 'jpg';
    const tok = Date.now().toString(36).slice(-4);
    const filename = field === c.fPasseport ? `Piece-identite-${code}-${tok}.${ext}` : `Carte-embarquement-${code}-${tok}.${ext}`;
    const body = JSON.stringify({ contentType: mime || 'application/octet-stream', file: buf.toString('base64'), filename });

    let uploaded = 0;
    for (const rec of recs.slice(0, 6)) {
      try {
        const up = await fetch(`https://content.airtable.com/v0/${c.base}/${rec.id}/${field}/uploadAttachment`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' },
          body,
        });
        if (up.ok) uploaded++;
        else console.error(`airtable-attach: upload ${filename} → ${rec.id} ${up.status}`);
      } catch (e) { console.error('airtable-attach: upload', e.message); }
    }
    return { uploaded, records: recs.length };
  } catch (e) {
    console.error('airtable-attach:', e.message);
    return { skipped: true, error: e.message };
  }
}

module.exports = { attachPieceToDossier, fieldForKind };
