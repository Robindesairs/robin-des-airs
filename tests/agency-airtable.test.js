import { describe, it, expect } from 'vitest';

const {
  isAttenteIncidentInput,
  agencyStatutFromRecord,
  dossierPayloadToAirtable,
  INCIDENT_ATTENTE_LABEL,
  PRICING,
} = require('../netlify/functions/lib/agency-airtable');

const mockCfg = {
  labels: {
    ref: 'Référence Dossier',
    prenom: 'Prénom Passager',
    nom: 'Nom Passager',
    email: 'Email',
    whatsapp: 'Numéro WhatsApp',
    adresse: 'Adresse domicile',
    vol: 'Numéro de vol',
    dateVol: 'Date du vol',
    compagnie: 'Compagnie Aérienne',
    pnr: 'PNR (Référence réservation)',
    incident: "Type d'incident",
    indemnite: "Montant de l'indemnité",
    itineraire: 'Itinéraire',
    statutSuivi: 'Statut du Dossier Suivi',
    remarques: 'Remarques',
  },
};

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

  it('fills partner Airtable columns on agency submit', () => {
    process.env.AIRTABLE_COL_DOSSIER_VIA_AGENCE = 'Dossier via agence';
    process.env.AIRTABLE_VAL_DOSSIER_VIA_AGENCE = 'Oui';
    const agency = { code: 'GSA-KMS-001', name: 'Kombo', airtableMatch: 'GSA-KMS-001' };
    const { fields } = dossierPayloadToAirtable(mockCfg, agency, {
      prenom: 'Amadou',
      nom: 'Jallow',
      tel: '+2207123456',
      pnr: 'ABC123',
      vol: 'AF718',
      compagnie: 'Air France',
      date: '2025-06-01',
      depart: 'BJL',
      arrivee: 'CDG',
      probleme: "Retard +3h à l'arrivée",
      nbPassagers: 2,
    });
    expect(fields['Dossier via agence']).toBe('Oui');
    expect(fields['Adresse domicile']).toMatch(/dépôt agence GSA-KMS-001/);
    expect(fields['Commission Agence']).toBe(PRICING.commissionEur * 2);
    expect(fields['Montant Client']).toBe(PRICING.clientNetEur * 2);
    expect(fields['Date Dossier']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fields['Date du vol']).toBe('2025-06-01');
    delete process.env.AIRTABLE_COL_DOSSIER_VIA_AGENCE;
    delete process.env.AIRTABLE_VAL_DOSSIER_VIA_AGENCE;
  });
});
