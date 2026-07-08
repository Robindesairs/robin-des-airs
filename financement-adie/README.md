# Dossier de financement Adie (comité de juillet 2026)

Demande de micro-crédit de 6 000 € (besoins totaux 7 000 €, apport 1 000 €) déposée auprès de Frédéric Mohr, Adie Mulhouse (fmohr@adie.org).

## Fichiers

- `dossier-financement-adie.html` → source du PDF `Dossier-Financement-RobinDesAirs-ADIE-v2.pdf` (10 pages : plan de financement, stratégie, trésorerie, annexes A/B avec facture Pitcher F262549 de 420 € TTC et proposition de forfait 2 000 € HT)
- `annexe-produit-adie.html` → source du PDF `Annexe-Produit-RobinDesAirs.pdf` (3 pages : site, parcours WhatsApp, dépôt de pièces, contrat en images)
- `images/` : captures utilisées par les deux documents

## Chiffres clés (version validée)

Charges 375 €/mois · fonds de roulement 6 mois = 2 250 € · juridique 2 820 € TTC · immatriculation 300 € · publicité 600 € · sécurité 1 030 € · point bas -5 220 € (M4) · autofinancé M8 · point mort 10 à 18 dossiers/an.

## Régénérer les PDF

```bash
node -e "const { chromium } = require('playwright'); (async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://$PWD/financement-adie/dossier-financement-adie.html', {waitUntil:'networkidle'}); await p.pdf({path:'financement-adie/Dossier-Financement-RobinDesAirs-ADIE-v2.pdf', format:'A4', printBackground:true, margin:{top:'14mm',bottom:'14mm',left:'13mm',right:'13mm'}}); await p.goto('file://$PWD/financement-adie/annexe-produit-adie.html', {waitUntil:'networkidle'}); await p.waitForTimeout(800); await p.pdf({path:'financement-adie/Annexe-Produit-RobinDesAirs.pdf', format:'A4', printBackground:true, margin:{top:'12mm',bottom:'12mm',left:'12mm',right:'12mm'}}); await b.close(); })()"
```

Règle d'écriture : aucun tiret long « — » dans ces documents (préférence du fondateur), ponctuation française classique.
