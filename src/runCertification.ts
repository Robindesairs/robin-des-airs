/**
 * Job de certification : récupère les vols du radar, vérifie les suspects via Amadeus, met à jour robin.db.
 * À lancer en cron ou manuellement : npx ts-node src/runCertification.ts
 */

require('dotenv').config();
import { runCertification } from './services/monitoringService';

async function main() {
  console.log('Démarrage du cycle de certification (radar + Amadeus)...');
  const result = await runCertification();
  console.log(
    `Terminé : ${result.flights.length} vol(s), ${result.certifiedCount} certifié(s) Amadeus, ${result.amadeusCheckedCount} vérification(s) Amadeus.`
  );
  if (result.error) console.error('Erreur radar:', result.error);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
