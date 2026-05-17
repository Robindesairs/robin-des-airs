import { describe, it, expect } from 'vitest';

const { formatWhatsApp, airtableStatutToCrm } = require('../netlify/functions/lib/crm-airtable-map');

describe('crm-airtable-map', () => {
  it('formats french mobile whatsapp', () => {
    expect(formatWhatsApp('+33', '612345678')).toBe('+33612345678');
  });

  it('maps airtable statut to crm code', () => {
    expect(airtableStatutToCrm('Mandat signé')).toBe('MANDAT_SIGNE');
    expect(airtableStatutToCrm('')).toBe('ELIGIBLE');
  });
});
