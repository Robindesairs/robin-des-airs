export type DemoDossier = {
  id: string;
  statut: string;
  priorite: string;
  date_creation: string;
  date_paiement: string | null;
  source: string;
  lrar_reception: string | null;
  agent: string;
  langue: string;
  pays: string;
  nom_complet: string;
  telephone: string;
  email: string;
  compagnie: string;
  vol_principal: string;
  date_vol: string;
  dep: string;
  arr: string;
  pnr: string;
  incident: string;
  palier: number;
  nb_passagers_indemnises: number;
  net_client: number;
  net_robin: number;
  total_reclame: number;
  interets_cumules: number;
  frais_recouvrement: number;
  interets_jours: number;
  forfait_40: number;
};

export const DEMO_DOSSIERS: DemoDossier[] = [
  {
    id: "RDA-2026-901",
    statut: "ELIGIBLE",
    priorite: "STANDARD",
    date_creation: "2026-03-28",
    date_paiement: null,
    source: "partenariat_agence",
    lrar_reception: "2026-03-30",
    agent: "agent_demo",
    langue: "fr",
    pays: "Sénégal",
    nom_complet: "Aminata DIALLO",
    telephone: "+221 771112233",
    email: "aminata.demo@example.com",
    compagnie: "Air France",
    vol_principal: "AF718",
    date_vol: "2026-03-15",
    dep: "CDG",
    arr: "DSS",
    pnr: "AB12CD",
    incident: "RETARD",
    palier: 600,
    nb_passagers_indemnises: 1,
    net_client: 450,
    net_robin: 150,
    total_reclame: 640,
    interets_cumules: 0,
    frais_recouvrement: 40,
    interets_jours: 12,
    forfait_40: 40,
  },
  {
    id: "RDA-2026-902",
    statut: "EN_NEGOCIATION",
    priorite: "HAUTE",
    date_creation: "2026-03-20",
    date_paiement: null,
    source: "parrainage_particulier",
    lrar_reception: "2026-03-22",
    agent: "agent_demo",
    langue: "fr",
    pays: "Mali",
    nom_complet: "Moussa TRAORE",
    telephone: "+223 70112233",
    email: "moussa.demo@example.com",
    compagnie: "Royal Air Maroc",
    vol_principal: "AT771",
    date_vol: "2026-03-05",
    dep: "CMN",
    arr: "CDG",
    pnr: "EF34GH",
    incident: "ANNULATION",
    palier: 400,
    nb_passagers_indemnises: 1,
    net_client: 300,
    net_robin: 100,
    total_reclame: 440,
    interets_cumules: 0,
    frais_recouvrement: 40,
    interets_jours: 8,
    forfait_40: 40,
  },
  {
    id: "RDA-2026-903",
    statut: "PAYE",
    priorite: "STANDARD",
    date_creation: "2026-02-28",
    date_paiement: "2026-03-25",
    source: "whatsapp",
    lrar_reception: "2026-03-02",
    agent: "agent_demo",
    langue: "fr",
    pays: "Côte d'Ivoire",
    nom_complet: "Kouadio KOFFI",
    telephone: "+225 0700112233",
    email: "kouadio.demo@example.com",
    compagnie: "Corsair",
    vol_principal: "SS987",
    date_vol: "2026-02-10",
    dep: "ABJ",
    arr: "ORY",
    pnr: "IJ56KL",
    incident: "RETARD",
    palier: 600,
    nb_passagers_indemnises: 1,
    net_client: 450,
    net_robin: 150,
    total_reclame: 640,
    interets_cumules: 0,
    frais_recouvrement: 40,
    interets_jours: 0,
    forfait_40: 40,
  },
];

