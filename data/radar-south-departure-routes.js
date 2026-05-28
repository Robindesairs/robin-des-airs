/**
 * Pôles départ Europe sud — paires prioritaires (EU → Afrique / CE 261).
 * Utilisé par Radar V2 (démo + référence). Hubs IATA scan AeroDataBox.
 */
(function () {
  'use strict';

  window.RADAR_SOUTH_DEPARTURE_ROUTES = {
    rome: {
      hub: 'FCO',
      label: 'Rome',
      scanGroup: '13',
      pairs: [
        { dep: 'FCO', arr: 'ABJ', label: 'Rome → Abidjan' },
        { dep: 'FCO', arr: 'ACC', label: 'Rome → Accra' },
        { dep: 'FCO', arr: 'DSS', label: 'Rome → Dakar' },
        { dep: 'FCO', arr: 'ADD', label: 'Rome → Addis-Abeba' },
        { dep: 'FCO', arr: 'NBO', label: 'Rome → Nairobi' },
        { dep: 'FCO', arr: 'JNB', label: 'Rome → Johannesburg' },
        { dep: 'FCO', arr: 'ALG', label: 'Rome → Alger', maghreb: true },
        { dep: 'FCO', arr: 'ABJ', label: 'Rome → Abidjan via Brussels Airlines', via: 'SN' },
        { dep: 'FCO', arr: 'JNB', label: 'Rome → Johannesburg via Air Europa', via: 'UX' },
      ],
    },
    milan: {
      hub: 'MXP',
      label: 'Milan',
      scanGroup: '14',
      pairs: [
        { dep: 'MXP', arr: 'DSS', label: 'Milan → Dakar' },
        { dep: 'MXP', arr: 'ABJ', label: 'Milan → Abidjan' },
        { dep: 'MXP', arr: 'DSS', label: 'Milan → Dakar (multi-compagnies)', note: 'AF, SN, TP, IB, ET, EK, QR, TK, VY' },
      ],
    },
    lisbon: {
      hub: 'LIS',
      label: 'Lisbonne',
      scanGroup: '7',
      pairs: [
        { dep: 'LIS', arr: 'DSS', label: 'Lisbonne → Dakar' },
        { dep: 'LIS', arr: 'ACC', label: 'Lisbonne → Accra' },
        { dep: 'LIS', arr: 'LAD', label: 'Lisbonne → Luanda' },
        { dep: 'LIS', arr: 'MPM', label: 'Lisbonne → Maputo' },
        { dep: 'LIS', arr: 'OXB', label: 'Lisbonne → Bissau' },
        { dep: 'LIS', arr: 'RAI', label: 'Lisbonne → Praia' },
        { dep: 'LIS', arr: 'ADD', label: 'Lisbonne → Addis-Abeba' },
      ],
    },
    madrid: {
      hub: 'MAD',
      label: 'Madrid',
      scanGroup: '15',
      pairs: [
        { dep: 'MAD', arr: 'DSS', label: 'Madrid → Dakar' },
        { dep: 'MAD', arr: 'ABJ', label: 'Madrid → Abidjan' },
        { dep: 'MAD', arr: 'ACC', label: 'Madrid → Accra' },
        { dep: 'MAD', arr: 'LOS', label: 'Madrid → Lagos' },
        { dep: 'MAD', arr: 'JNB', label: 'Madrid → Johannesburg' },
      ],
    },
    barcelona: {
      hub: 'BCN',
      label: 'Barcelone',
      scanGroup: '16',
      pairs: [
        { dep: 'BCN', arr: 'DSS', label: 'Barcelone → Dakar' },
        { dep: 'BCN', arr: 'BJL', label: 'Barcelone → Banjul' },
      ],
    },
  };
})();
