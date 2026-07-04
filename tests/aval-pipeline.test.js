import { describe, it, expect } from 'vitest';

const aval = require('../netlify/functions/lib/aval-pipeline');
const { buildClaimPlan } = require('../netlify/functions/aval-generate-claim');
const { buildEnvelope } = require('../netlify/functions/aval-send-claim');
const { computeRelances } = require('../netlify/functions/aval-relances');
const { computeEscalade } = require('../netlify/functions/aval-escalade');
const { addBusinessDays } = require('../netlify/functions/aval-suivi-paiement');

const NOW = new Date('2026-07-04T00:00:00Z');

function dossier(overrides = {}) {
  return {
    fields: {
      'Référence Dossier': 'RDA1234',
      'Prénom Passager': 'Awa',
      'Nom Passager': 'Diallo',
      'Numéro de vol': 'AF719',
      'Compagnie Aérienne': 'Air France',
      'Itinéraire': 'DSS-CDG',
      'Date du vol': '01/01/2026',
      'Statut du Dossier Suivi': 'LRAR envoyée',
      "Montant de l'indemnité": '600',
      'Remarques': '',
      ...overrides,
    },
  };
}

describe('aval-pipeline: normalizeDossier', () => {
  it('normalizes Airtable fields', () => {
    const d = aval.normalizeDossier(dossier());
    expect(d.ref).toBe('RDA1234');
    expect(d.name).toBe('Awa Diallo');
    expect(d.montant).toBe(600);
    expect(d.vol).toBe('AF719');
  });
  it('accepts already-normalized objects', () => {
    const d = aval.normalizeDossier({ ref: 'X', montant: 400 });
    expect(d.ref).toBe('X');
    expect(d.montant).toBe(400);
  });
});

describe('aval-pipeline: commission & repartition', () => {
  it('25/75 en phase amiable', () => {
    const c = aval.commission('amiable');
    expect(c.commissionPct).toBe(25);
    expect(c.clientPct).toBe(75);
  });
  it('40/60 en phase contentieuse', () => {
    const c = aval.commission('contentieux');
    expect(c.commissionPct).toBe(40);
    expect(c.clientPct).toBe(60);
  });
  it('répartit 600€ amiable → 450 client / 150 robin', () => {
    const r = aval.repartition(600, 'amiable');
    expect(r.partClient).toBe(450);
    expect(r.partRobin).toBe(150);
    expect(r.versementClientDelai).toMatch(/5 jours ouvrés/);
  });
  it('répartit 600€ contentieux → 360 client / 240 robin', () => {
    const r = aval.repartition(600, 'contentieux');
    expect(r.partClient).toBe(360);
    expect(r.partRobin).toBe(240);
  });
  it('somme des parts = total (pas de perte au centime)', () => {
    const r = aval.repartition(333.33, 'amiable');
    expect(Math.round((r.partClient + r.partRobin) * 100) / 100).toBe(r.total);
  });
});

describe('aval-pipeline: nextRelance', () => {
  it('pas de MED → pas de relance', () => {
    const d = aval.normalizeDossier(dossier());
    const r = aval.nextRelance(d, NOW);
    expect(r.due).toBe(false);
  });
  it('J+20 après MED → relance #1 due', () => {
    const d = aval.normalizeDossier(dossier({ Remarques: 'MED générée 2026-06-14 — à valider' }));
    const r = aval.nextRelance(d, NOW);
    expect(r.due).toBe(true);
    expect(r.rang).toBe(1);
  });
  it('relance #1 déjà consignée → n’en repropose pas #1', () => {
    const d = aval.normalizeDossier(dossier({ Remarques: 'MED générée 2026-06-14 | relance #1 envoyée' }));
    const r = aval.nextRelance(d, NOW);
    // 20 jours < 30 → #2 pas encore due
    expect(r.due).toBe(false);
  });
  it('J+35 avec #1 faite → relance #2 due', () => {
    const d = aval.normalizeDossier(dossier({ Remarques: 'MED générée 2026-05-30 | relance #1 envoyée' }));
    const r = aval.nextRelance(d, NOW);
    expect(r.due).toBe(true);
    expect(r.rang).toBe(2);
  });
});

describe('aval-pipeline: shouldEscalate', () => {
  it('dossier terminal → pas d’escalade', () => {
    const d = aval.normalizeDossier(dossier({ 'Statut du Dossier Suivi': 'Payé', Remarques: 'MED générée 2026-01-01' }));
    const e = aval.shouldEscalate(d, NOW);
    expect(e.escalate).toBe(false);
  });
  it('MED < 62j → pas encore', () => {
    const d = aval.normalizeDossier(dossier({ Remarques: 'MED générée 2026-06-14' }));
    const e = aval.shouldEscalate(d, NOW);
    expect(e.escalate).toBe(false);
  });
  it('MED > 62j → escalade tribunal + commission 40%', () => {
    const d = aval.normalizeDossier(dossier({ Remarques: 'MED générée 2026-04-01' }));
    const e = aval.shouldEscalate(d, NOW);
    expect(e.escalate).toBe(true);
    expect(e.juridiction).toBe('Tribunal de commerce');
    expect(e.commission.commissionPct).toBe(40);
  });
});

describe('aval-generate-claim: buildClaimPlan', () => {
  it('éligibilité au conditionnel, régime cession, commission 25%', () => {
    const plan = buildClaimPlan(aval.normalizeDossier(dossier()));
    expect(plan.regime).toBe('cession');
    expect(plan.commission.commissionPct).toBe(25);
    expect(plan.eligibiliteMention).toMatch(/peut donner droit/);
    expect(plan.montantReclame).toBe(600);
  });
});

describe('aval-send-claim: buildEnvelope', () => {
  it('LRAR + pas de garantie de délai', () => {
    const env = buildEnvelope(aval.normalizeDossier(dossier()));
    expect(env.canal).toBe('lrar');
    expect(env.mentionDelai).toMatch(/aucun délai.*garanti/i);
    expect(env.piecesJointes).toContain('cession-signee.pdf');
  });
});

describe('aval-relances: computeRelances', () => {
  it('agrège les dossiers dus', () => {
    const list = [
      dossier({ 'Référence Dossier': 'A', Remarques: 'MED générée 2026-06-14' }), // #1 due
      dossier({ 'Référence Dossier': 'B', Remarques: '' }), // pas de MED
    ];
    const q = computeRelances(list, NOW);
    expect(q.total).toBe(1);
    expect(q.dues[0].ref).toBe('A');
    expect(q.dues[0].rang).toBe(1);
  });
});

describe('aval-escalade: computeEscalade', () => {
  it('ne retient que les dossiers mûrs', () => {
    const list = [
      dossier({ 'Référence Dossier': 'OLD', Remarques: 'MED générée 2026-04-01' }), // >62j
      dossier({ 'Référence Dossier': 'NEW', Remarques: 'MED générée 2026-06-14' }), // <62j
    ];
    const r = computeEscalade(list, NOW);
    expect(r.total).toBe(1);
    expect(r.dossiers[0].ref).toBe('OLD');
    expect(r.dossiers[0].commission.commissionPct).toBe(40);
  });
});

describe('aval-suivi-paiement: addBusinessDays', () => {
  it('+5 jours ouvrés depuis un jeudi saute le week-end', () => {
    // 2026-07-02 est un jeudi → +5 ouvrés = jeudi suivant 2026-07-09
    expect(addBusinessDays('2026-07-02', 5)).toBe('2026-07-09');
  });
  it('date invalide → null', () => {
    expect(addBusinessDays('pas-une-date', 5)).toBe(null);
  });
});
