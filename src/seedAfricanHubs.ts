/**
 * Remplit la table airports avec les 44 hubs africains (coordonnées + timezone) via Amadeus.
 * À lancer une fois ou après mise à jour de la liste : npx ts-node src/seedAfricanHubs.ts
 */

require('dotenv').config();
import { fetchAndStoreAfricanHubs } from './services/amadeusService';

async function main() {
  console.log('Récupération des 44 hubs africains (Amadeus Airport & City Search)...');
  const { stored, failed } = await fetchAndStoreAfricanHubs();
  console.log(`Terminé : ${stored} aéroports enregistrés dans robin.db (table airports).`);
  if (failed.length > 0) console.log('Non trouvés ou erreur API :', failed.join(', '));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
