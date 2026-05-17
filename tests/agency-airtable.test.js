import { describe, it, expect } from 'vitest';

const {
  isAttenteIncidentInput,
  agencyStatutFromRecord,
  INCIDENT_ATTENTE_LABEL,
} = require('../netlify/functions/lib/agency-airtable');

describe('agency-airtable', () => {
  it('detects attente incident from flag', () => {
    expect(isAttenteIncidentInput({ attenteIncident: true })).toBe(true);
    expect(isAttenteIncidentInput({ probleme: 'autre' })).toBe(false);
  });

  it('detects attente from probleme text', () => {
    expect(isAttenteIncidentInput({ probleme: "En attente d'incident" })).toBe(true);
    expect(isAttenteIncidentInput({ probleme: 'Billet vendu — retard à venir' })).toBe(true);
  });

  it('maps attente incident statut UI', () => {
    const s = agencyStatutFromRecord({
      incident: INCIDENT_ATTENTE_LABEL,
      statutSuivi: 'Nouveau',
    });
    expect(s).toBe('attente-incident');
  });

  it('keeps paye when incident was attente', () => {
    const s = agencyStatutFromRecord({
      incident: INCIDENT_ATTENTE_LABEL,
      statutSuivi: 'Payé client',
    });
    expect(s).toBe('paye');
  });
});
