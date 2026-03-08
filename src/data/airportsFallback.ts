/**
 * Repli statique : coordonnées et timezone pour aéroports africains (et hubs diaspora).
 * Utilisé quand Amadeus ne renvoie rien (env TEST limité à US, ES, UK, DE, IN).
 * Données : références publiques (OurAirports, OACI, Wikipedia).
 */

export interface AirportFallbackRow {
  iataCode: string;
  name: string;
  cityName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezoneOffset: string;
}

export const AIRPORTS_FALLBACK: AirportFallbackRow[] = [
  { iataCode: 'ABJ', name: 'Félix Houphouët-Boigny', cityName: 'Abidjan', countryCode: 'CI', latitude: 5.261386, longitude: -3.926294, timezoneOffset: '+00:00' },
  { iataCode: 'ACC', name: 'Kotoka', cityName: 'Accra', countryCode: 'GH', latitude: 5.605186, longitude: -0.166786, timezoneOffset: '+00:00' },
  { iataCode: 'ABV', name: 'Nnamdi Azikiwe', cityName: 'Abuja', countryCode: 'NG', latitude: 9.006792, longitude: 7.263056, timezoneOffset: '+01:00' },
  { iataCode: 'ADD', name: 'Bole', cityName: 'Addis-Abeba', countryCode: 'ET', latitude: 8.977889, longitude: 38.799319, timezoneOffset: '+03:00' },
  { iataCode: 'ALG', name: 'Houari Boumediene', cityName: 'Alger', countryCode: 'DZ', latitude: 36.691014, longitude: 3.215408, timezoneOffset: '+01:00' },
  { iataCode: 'BGF', name: 'Bangui M\'Poko', cityName: 'Bangui', countryCode: 'CF', latitude: 4.398475, longitude: 18.518786, timezoneOffset: '+01:00' },
  { iataCode: 'BJL', name: 'Banjul', cityName: 'Banjul', countryCode: 'GM', latitude: 13.337961, longitude: -16.652206, timezoneOffset: '+00:00' },
  { iataCode: 'BKO', name: 'Sénou', cityName: 'Bamako', countryCode: 'ML', latitude: 12.533544, longitude: -7.949944, timezoneOffset: '+00:00' },
  { iataCode: 'BZV', name: 'Maya-Maya', cityName: 'Brazzaville', countryCode: 'CG', latitude: -4.251701, longitude: 15.253031, timezoneOffset: '+01:00' },
  { iataCode: 'CAI', name: 'Cairo International', cityName: 'Cairo', countryCode: 'EG', latitude: 30.121901, longitude: 31.4056, timezoneOffset: '+02:00' },
  { iataCode: 'CMN', name: 'Mohammed V', cityName: 'Casablanca', countryCode: 'MA', latitude: 33.367466, longitude: -7.589843, timezoneOffset: '+00:00' },
  { iataCode: 'COO', name: 'Cadjehoun', cityName: 'Cotonou', countryCode: 'BJ', latitude: 6.357228, longitude: 2.384353, timezoneOffset: '+01:00' },
  { iataCode: 'CPT', name: 'Cape Town International', cityName: 'Cape Town', countryCode: 'ZA', latitude: -33.971459, longitude: 18.602089, timezoneOffset: '+02:00' },
  { iataCode: 'DAR', name: 'Julius Nyerere', cityName: 'Dar es Salaam', countryCode: 'TZ', latitude: -6.878111, longitude: 39.202625, timezoneOffset: '+03:00' },
  { iataCode: 'DKR', name: 'Léopold Sédar Senghor', cityName: 'Dakar', countryCode: 'SN', latitude: 14.739708, longitude: -17.490234, timezoneOffset: '+00:00' },
  { iataCode: 'DSS', name: 'Blaise Diagne', cityName: 'Dakar', countryCode: 'SN', latitude: 14.670083, longitude: -17.073333, timezoneOffset: '+00:00' },
  { iataCode: 'DLA', name: 'Douala', cityName: 'Douala', countryCode: 'CM', latitude: 4.006081, longitude: 9.719481, timezoneOffset: '+01:00' },
  { iataCode: 'FDF', name: 'Martinique Aimé Césaire', cityName: 'Fort-de-France', countryCode: 'MQ', latitude: 14.590944, longitude: -61.003175, timezoneOffset: '-04:00' },
  { iataCode: 'FIH', name: 'Ndjili', cityName: 'Kinshasa', countryCode: 'CD', latitude: -4.385744, longitude: 15.444569, timezoneOffset: '+01:00' },
  { iataCode: 'FNA', name: 'Lungi', cityName: 'Freetown', countryCode: 'SL', latitude: 8.616444, longitude: -13.195489, timezoneOffset: '+00:00' },
  { iataCode: 'JIB', name: 'Ambouli', cityName: 'Djibouti', countryCode: 'DJ', latitude: 11.547333, longitude: 43.159489, timezoneOffset: '+03:00' },
  { iataCode: 'JNB', name: 'O.R. Tambo', cityName: 'Johannesburg', countryCode: 'ZA', latitude: -26.136721, longitude: 28.241068, timezoneOffset: '+02:00' },
  { iataCode: 'KGL', name: 'Kigali', cityName: 'Kigali', countryCode: 'RW', latitude: -1.968628, longitude: 30.139469, timezoneOffset: '+02:00' },
  { iataCode: 'LAD', name: 'Quatro de Fevereiro', cityName: 'Luanda', countryCode: 'AO', latitude: -8.858375, longitude: 13.231178, timezoneOffset: '+01:00' },
  { iataCode: 'LBV', name: 'Libreville', cityName: 'Libreville', countryCode: 'GA', latitude: 0.4586, longitude: 9.412283, timezoneOffset: '+01:00' },
  { iataCode: 'LFW', name: 'Gnassingbé Eyadéma', cityName: 'Lomé', countryCode: 'TG', latitude: 6.165611, longitude: 1.254511, timezoneOffset: '+00:00' },
  { iataCode: 'LOS', name: 'Murtala Muhammed', cityName: 'Lagos', countryCode: 'NG', latitude: 6.577369, longitude: 3.321156, timezoneOffset: '+01:00' },
  { iataCode: 'MRU', name: 'Sir Seewoosagur Ramgoolam', cityName: 'Port-Louis', countryCode: 'MU', latitude: -20.430235, longitude: 57.6836, timezoneOffset: '+04:00' },
  { iataCode: 'NBO', name: 'Jomo Kenyatta', cityName: 'Nairobi', countryCode: 'KE', latitude: -1.319167, longitude: 36.9275, timezoneOffset: '+03:00' },
  { iataCode: 'NDJ', name: 'N\'Djamena', cityName: 'N\'Djamena', countryCode: 'TD', latitude: 12.133689, longitude: 15.034019, timezoneOffset: '+01:00' },
  { iataCode: 'NIM', name: 'Diori Hamani', cityName: 'Niamey', countryCode: 'NE', latitude: 13.481547, longitude: 2.183614, timezoneOffset: '+01:00' },
  { iataCode: 'NKC', name: 'Nouakchott–Oumtounsy', cityName: 'Nouakchott', countryCode: 'MR', latitude: 18.310143, longitude: -15.969531, timezoneOffset: '+00:00' },
  { iataCode: 'NSI', name: 'Yaoundé Nsimalen', cityName: 'Yaoundé', countryCode: 'CM', latitude: 3.722556, longitude: 11.553269, timezoneOffset: '+01:00' },
  { iataCode: 'OUA', name: 'Thomas Sankara', cityName: 'Ouagadougou', countryCode: 'BF', latitude: 12.353194, longitude: -1.512417, timezoneOffset: '+00:00' },
  { iataCode: 'PNR', name: 'Pointe-Noire', cityName: 'Pointe-Noire', countryCode: 'CG', latitude: -4.816028, longitude: 11.886597, timezoneOffset: '+01:00' },
  { iataCode: 'PTP', name: 'Pointe-à-Pitre', cityName: 'Pointe-à-Pitre', countryCode: 'GP', latitude: 16.265306, longitude: -61.531806, timezoneOffset: '-04:00' },
  { iataCode: 'RAK', name: 'Marrakech Menara', cityName: 'Marrakech', countryCode: 'MA', latitude: 31.606886, longitude: -8.0363, timezoneOffset: '+00:00' },
  { iataCode: 'ROB', name: 'Roberts', cityName: 'Monrovia', countryCode: 'LR', latitude: 6.233789, longitude: -10.362311, timezoneOffset: '+00:00' },
  { iataCode: 'RUN', name: 'Roland Garros', cityName: 'Saint-Denis', countryCode: 'RE', latitude: -20.8871, longitude: 55.510308, timezoneOffset: '+04:00' },
  { iataCode: 'SSG', name: 'Malabo', cityName: 'Malabo', countryCode: 'GQ', latitude: 3.755267, longitude: 8.708717, timezoneOffset: '+01:00' },
  { iataCode: 'TNR', name: 'Ivato', cityName: 'Antananarivo', countryCode: 'MG', latitude: -18.79695, longitude: 47.478806, timezoneOffset: '+03:00' },
  { iataCode: 'TUN', name: 'Carthage', cityName: 'Tunis', countryCode: 'TN', latitude: 36.851033, longitude: 10.227217, timezoneOffset: '+01:00' },
  { iataCode: 'MPM', name: 'Maputo', cityName: 'Maputo', countryCode: 'MZ', latitude: -25.920836, longitude: 32.572606, timezoneOffset: '+02:00' },
  { iataCode: 'CKY', name: 'Conakry', cityName: 'Conakry', countryCode: 'GN', latitude: 9.576889, longitude: -13.611961, timezoneOffset: '+00:00' },
  { iataCode: 'ZNZ', name: 'Zanzibar', cityName: 'Zanzibar', countryCode: 'TZ', latitude: -6.222025, longitude: 39.224886, timezoneOffset: '+03:00' },
];

const FALLBACK_MAP = new Map(AIRPORTS_FALLBACK.map((a) => [a.iataCode.toUpperCase(), a]));

export function getAirportFallback(iataCode: string): AirportFallbackRow | null {
  return FALLBACK_MAP.get((iataCode || '').trim().toUpperCase()) ?? null;
}
