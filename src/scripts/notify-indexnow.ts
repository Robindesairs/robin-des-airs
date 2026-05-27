/**
 * Ping IndexNow (Bing, Yandex, Naver, Seznam, …) avec les URLs modifiées.
 *
 * Usage :
 *   npm run notify:indexnow          → URLs avec lastmod = aujourd'hui
 *   npm run notify:indexnow -- --all → toutes les URLs du sitemap (bootstrap)
 *
 * Le ping est non-bloquant : si l'API IndexNow renvoie une erreur, on log
 * et on sort en code 0 pour ne pas casser le build Netlify.
 */

import * as fs from 'fs';
import * as path from 'path';

const SITE_HOST = 'robindesairs.eu';
const KEY = '444128df0aa6b3382537b67069c2883b';
const KEY_LOCATION = `https://${SITE_HOST}/${KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_PATH = path.join(process.cwd(), 'sitemap.xml');
const TODAY = new Date().toISOString().slice(0, 10);

type UrlRecord = { loc: string; lastmod: string };

function parseSitemap(): UrlRecord[] {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`[indexnow] sitemap.xml introuvable (${SITEMAP_PATH}) — rien à pinger.`);
    return [];
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const records: UrlRecord[] = [];
  // Capture chaque <url>...</url>, puis <loc> et <lastmod> à l'intérieur.
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (locMatch) {
      records.push({
        loc: locMatch[1].trim(),
        lastmod: lastmodMatch ? lastmodMatch[1].trim() : '',
      });
    }
  }
  return records;
}

async function postIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    console.log('[indexnow] Aucune URL à pinger.');
    return;
  }
  // IndexNow accepte jusqu'à 10 000 URLs par requête.
  const body = {
    host: SITE_HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };
  console.log(`[indexnow] POST → ${INDEXNOW_ENDPOINT} (${urls.length} URLs)`);
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`[indexnow] HTTP ${res.status} ${res.statusText}`);
    if (text) console.log(`[indexnow] body: ${text.slice(0, 500)}`);
    // 200 = accepté, 202 = accepté en file, 422 = certaines URLs invalides
    // (souvent OK quand mix avec /blog/ qui n'existent pas encore en HTML).
    if (![200, 202, 422].includes(res.status)) {
      console.warn(`[indexnow] Réponse inhabituelle (${res.status}) — non bloquant.`);
    }
  } catch (err) {
    console.warn(`[indexnow] Erreur réseau : ${(err as Error).message} — non bloquant.`);
  }
}

async function main(): Promise<void> {
  const pushAll = process.argv.includes('--all');
  const records = parseSitemap();
  if (records.length === 0) return;

  const target = pushAll
    ? records
    : records.filter((r) => r.lastmod === TODAY);

  if (target.length === 0) {
    console.log(`[indexnow] Aucune URL modifiée aujourd'hui (${TODAY}).`);
    return;
  }

  console.log(
    `[indexnow] Mode ${pushAll ? 'ALL' : 'TODAY'} → ${target.length}/${records.length} URLs`
  );
  await postIndexNow(target.map((r) => r.loc));
}

main().catch((e) => {
  console.warn(`[indexnow] Fatal non-bloquant : ${e.message}`);
  process.exit(0);
});
