#!/usr/bin/env node
/**
 * Génère docs/mandat-fr.pdf depuis mandat.html (version française).
 * Usage: node scripts/generate-mandat-pdf.mjs
 * Prérequis: npx puppeteer (télécharge Chromium au premier run).
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'documents', 'mandat-fr.html');
const outPath = path.join(root, 'documents', 'mandat-fr.pdf');
const fileUrl = 'file://' + htmlPath;

async function loadPuppeteer() {
  try {
    return (await import('puppeteer')).default;
  } catch {
    const require = createRequire(import.meta.url);
    return require('puppeteer');
  }
}

const printCss = `
  .topbar, .progress-wrap, .trust-bar, #btnSub, #btnAddPax, .sig-clear, .sig-ph,
  .ferr, #successScreen, #checkErr, #coPassErr, #sigErr { display: none !important; }
  #mandatForm { display: block !important; }
  .page { max-width: 100%; padding: 0; margin: 0; }
  body { background: white; }
  input, textarea, select {
    border: none !important;
    border-bottom: 1px solid #888 !important;
    background: transparent !important;
    min-height: 1.4em;
  }
  button, .btn-submit { display: none !important; }
  .single-check { pointer-events: none; }
  .single-check input { display: inline-block !important; width: 14px; height: 14px; }
`;

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error('Fichier introuvable:', htmlPath);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.emulateMediaType('print');
  await page.addStyleTag({ content: printCss });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '12mm', bottom: '16mm', left: '12mm' },
  });
  await browser.close();
  const stat = fs.statSync(outPath);
  console.log('PDF créé:', outPath, '(' + Math.round(stat.size / 1024) + ' Ko)');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
