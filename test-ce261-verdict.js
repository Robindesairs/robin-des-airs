/**
 * Test unitaire de la logique pure ce261-verdict (aucun réseau).
 * node test-ce261-verdict.js
 */
const { verdict } = require('./netlify/functions/lib/ce261-verdict');
let pass = 0, fail = 0;
function eq(label, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log(`❌ ${label}: attendu "${want}", obtenu "${got}"`); }
}

// 1. Dakar → Paris, Air France, retard 4h → éligible 600€ (>3500 km)
let v = verdict({ depIata: 'DSS', arrIata: 'CDG', delayMin: 240, distanceKm: 4200, carrierIata: 'AF', typeVol: 'direct' });
eq('DSS→CDG AF 4h', v.verdict, 'eligible'); eq('DSS→CDG AF montant', v.perPax, 600);

// 2. Casablanca → Paris, Royal Air Maroc (AT, non-UE), départ hors-UE → hors champ
v = verdict({ depIata: 'CMN', arrIata: 'CDG', delayMin: 300, distanceKm: 1900, carrierIata: 'AT', typeVol: 'direct' });
eq('CMN→CDG AT non-UE', v.verdict, 'hors_champ');

// 3. Paris → Dakar, Air Sénégal (HC, non-UE) MAIS départ UE → couvert, éligible
v = verdict({ depIata: 'CDG', arrIata: 'DSS', delayMin: 200, distanceKm: 4200, carrierIata: 'HC', typeVol: 'direct' });
eq('CDG→DSS départ UE', v.verdict, 'eligible');

// 4. Casablanca → Paris, Air France (UE) arrivée UE → couvert (compagnie UE), éligible 400€ (Maghreb <3500)
v = verdict({ depIata: 'CMN', arrIata: 'CDG', delayMin: 200, distanceKm: 1900, carrierIata: 'AF', typeVol: 'direct' });
eq('CMN→CDG AF UE', v.verdict, 'eligible'); eq('CMN→CDG AF 400€', v.perPax, 400);

// 5. Retard < 3h → sous_seuil (jamais "hors champ")
v = verdict({ depIata: 'DSS', arrIata: 'CDG', delayMin: 90, distanceKm: 4200, carrierIata: 'AF', typeVol: 'direct' });
eq('retard 90min', v.verdict, 'sous_seuil');

// 6. Correspondance → toujours à vérifier
v = verdict({ depIata: 'DSS', arrIata: 'SXB', delayMin: 300, distanceKm: 4300, carrierIata: 'AF', typeVol: 'escale' });
eq('escale', v.verdict, 'a_verifier');

// 7. Annulation (statut) → à vérifier (préavis)
v = verdict({ depIata: 'DSS', arrIata: 'CDG', delayMin: 0, distanceKm: 4200, carrierIata: 'AF', status: 'Cancelled', typeVol: 'direct' });
eq('annulation', v.verdict, 'a_verifier');

// 8. Retard inconnu (null) sur vol couvert → à vérifier, jamais rejet
v = verdict({ depIata: 'CDG', arrIata: 'ABJ', delayMin: null, distanceKm: 5135, carrierIata: 'AF', typeVol: 'direct' });
eq('retard null', v.verdict, 'a_verifier');

// 9. Distance inconnue → défaut 600€
v = verdict({ depIata: 'CDG', arrIata: 'ABJ', delayMin: 200, distanceKm: null, carrierIata: 'AF', typeVol: 'direct' });
eq('distance null defaut', v.perPax, 600);

console.log(`\n${pass} OK / ${fail} KO`);
process.exit(fail ? 1 : 0);
