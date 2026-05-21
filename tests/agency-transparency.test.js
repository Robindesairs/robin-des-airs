import { describe, it, expect } from 'vitest';

const { buildAgencyTransparency } = require('../netlify/functions/lib/agency-transparency');

describe('agency-transparency', () => {
  it('formats accepted with percentage', () => {
    const t = buildAgencyTransparency(
      {
        indemniteReference: 600,
        montantClient: 450,
        raisonCompagnie: 'Accord amiable',
      },
      'gagne',
      'fr'
    );
    expect(t.decision).toBe('accepted');
    expect(t.percentOfReference).toBe(75);
    expect(t.summary).toMatch(/75\s*%/);
    expect(t.summary).toMatch(/acceptation/i);
  });

  it('formats refused with justification', () => {
    const t = buildAgencyTransparency(
      { raisonCompagnie: 'Extraordinary circumstances — weather' },
      'rejete',
      'en'
    );
    expect(t.decision).toBe('refused');
    expect(t.summary).toMatch(/refused/i);
    expect(t.summary).toMatch(/weather/i);
  });

  it('pending when still in progress', () => {
    const t = buildAgencyTransparency({}, 'en-cours', 'fr');
    expect(t.decision).toBe('pending');
    expect(t.summary).toMatch(/attente/i);
  });
});
