/**
 * Envoie une notification Telegram : un seul message qui empile tous les vols critiques.
 * Variables Netlify : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * POST body : { flights: [ { flight, dep, arr, cancelled, delayMinutes, airline, scheduledDeparture, scheduledArrival, statusFr }, ... ] }
 * (Un seul vol en backward compat : { flight, dep, arr, ... } sans tableau.)
 */

function formatOneFlight(f, index) {
  const flight = f.flight || '—';
  const dep = f.dep || '—';
  const arr = f.arr || '—';
  const cancelled = !!f.cancelled;
  const delayMinutes = f.delayMinutes != null ? f.delayMinutes : 0;
  const airline = f.airline || '—';
  const scheduledDep = f.scheduledDeparture || '—';
  const scheduledArr = f.scheduledArrival || '—';
  const statusFr = f.statusFr || '—';
  const num = index != null ? index + 1 + ') ' : '';
  const problem = cancelled ? '❌ Annulé' : `⏱ Retard : ${delayMinutes} min`;
  return [
    `${num}✈️ ${flight} (${airline}) — ${dep} → ${arr}`,
    `   ${problem} | Départ ${scheduledDep} | Arrivée ${scheduledArr}`,
    `   Statut : ${statusFr}`
  ].join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, reason: 'Telegram non configuré (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const list = Array.isArray(payload.flights) && payload.flights.length > 0
    ? payload.flights
    : (payload.flight != null || payload.dep != null ? [payload] : []);

  if (list.length === 0) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, reason: 'Aucun vol' }) };
  }

  const title = list.length === 1
    ? (list[0].cancelled ? '🚨 VOL ANNULÉ' : '🔴 VOL CRITIQUE (retard ≥ 2h30)')
    : `🔴 ${list.length} VOLS CRITIQUES`;
  const blocks = list.map((f, i) => formatOneFlight(f, i));
  const text = [title, '', blocks.join('\n\n'), '', '🏹 Robin des Airs — Radar Elite'].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: data.description })
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error('telegram-notify err:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
