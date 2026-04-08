import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAgencyClientAmount, getPartnerCommissionFromSource, getPartnerLabelFromSource, isAgenceSource } from "@/lib/compta";
import { DEMO_DOSSIERS } from "@/lib/demoData";

type BeneficiaireType = "client" | "partenaire";
type DemoVersement = {
  statut?: string;
  mode_paiement?: string | null;
  reference_paiement?: string | null;
  bic_code?: string | null;
  banque_nom?: string | null;
  banque_detectee_auto?: boolean;
  date_paiement?: string | null;
  date_reception_virement?: string | null;
  commentaire?: string | null;
};

const DEMO_VERSEMENTS = new Map<string, DemoVersement>();

function buildDemoRows() {
  const rows = DEMO_DOSSIERS.map((d) => {
    const grossAmount = Number(d.palier ?? 0) * Number(d.nb_passagers_indemnises ?? 1);
    const clientAmount = isAgenceSource(d.source) ? getAgencyClientAmount(grossAmount) : Number(d.net_client ?? 0);
    const partnerAmount = getPartnerCommissionFromSource(d.source, d.net_robin, d.palier);
    const baseClient: DemoVersement = {
      statut: d.statut === "PAYE" ? "PAYE" : "A_PAYER",
      mode_paiement: "RIB",
      reference_paiement: "FR7612345678901234567890123",
      date_paiement: d.statut === "PAYE" ? d.date_paiement : null,
      date_reception_virement: d.statut === "PAYE" ? d.date_paiement : null,
    };
    const basePartner: DemoVersement = partnerAmount > 0
      ? {
          statut: "A_PAYER",
          mode_paiement: "WAVE",
          reference_paiement: "221770001122",
          date_paiement: null,
          date_reception_virement: null,
        }
      : { statut: "ANNULE" };

    const overrideClient = DEMO_VERSEMENTS.get(`${d.id}:client`) ?? {};
    const overridePartner = DEMO_VERSEMENTS.get(`${d.id}:partenaire`) ?? {};

    return {
      dossier_id: d.id,
      statut_dossier: d.statut,
      source: d.source,
      date_creation: d.date_creation,
      client_nom: d.nom_complet,
      client_montant: clientAmount,
      partenaire_nom: getPartnerLabelFromSource(d.source),
      partenaire_montant: partnerAmount,
      versement_client: { ...baseClient, ...overrideClient },
      versement_partenaire: { ...basePartner, ...overridePartner },
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      if (r.versement_client?.statut !== "PAYE") acc.client_a_payer += Number(r.client_montant ?? 0);
      if (r.partenaire_montant > 0 && r.versement_partenaire?.statut !== "PAYE") acc.partenaire_a_payer += Number(r.partenaire_montant ?? 0);
      return acc;
    },
    { client_a_payer: 0, partenaire_a_payer: 0 }
  );

  return { rows, totals, demo: true };
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const [{ data: dossiers, error: dossiersErr }, { data: versements, error: versementsErr }] = await Promise.all([
      supabase.from("dossiers").select("id, statut, source, date_creation").order("date_creation", { ascending: false }),
      supabase.from("compta_versements").select("*"),
    ]);

    if (dossiersErr || versementsErr) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json(buildDemoRows());
      }
      return NextResponse.json({ error: dossiersErr?.message || versementsErr?.message || "Erreur Supabase" }, { status: 500 });
    }

    const dossierIds = (dossiers ?? []).map((d) => d.id);
    const { data: calculs, error: calculsErr } = await supabase
      .from("calculs")
      .select("dossier_id, net_client, commission_robin, palier, nb_passagers_indemnises")
      .in("dossier_id", dossierIds);
    if (calculsErr) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ rows: [], totals: { client_a_payer: 0, partenaire_a_payer: 0 }, demo: true });
      }
      return NextResponse.json({ error: calculsErr.message }, { status: 500 });
    }

    const { data: passagers } = await supabase
      .from("passagers")
      .select("dossier_id, rang, prenom, nom")
      .in("dossier_id", dossierIds);

    const calcByDossier = new Map<string, { netClient: number; netRobin: number; gross: number; palier: number }>();
    (calculs ?? []).forEach((c) => {
      calcByDossier.set(c.dossier_id, {
        netClient: Number(c.net_client ?? 0),
        netRobin: Number(c.commission_robin ?? 0),
        gross: Number(c.palier ?? 0) * Number(c.nb_passagers_indemnises ?? 1),
        palier: Number(c.palier ?? 0),
      });
    });
    const paxByDossier = new Map<string, string>();
    (passagers ?? []).forEach((p) => {
      if (p.rang === 1) paxByDossier.set(p.dossier_id, `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "Client");
    });

    const versementByKey = new Map<string, Record<string, unknown>>();
    (versements ?? []).forEach((v) => {
      versementByKey.set(`${v.dossier_id}:${v.beneficiaire_type}`, v);
    });

    const rows: Record<string, unknown>[] = [];
    for (const d of dossiers ?? []) {
      const calc = calcByDossier.get(d.id) ?? { netClient: 0, netRobin: 0, gross: 0, palier: 0 };
      const clientMontant = isAgenceSource(d.source) ? getAgencyClientAmount(calc.gross) : calc.netClient;
      const partnerMontant = getPartnerCommissionFromSource(d.source, calc.netRobin, calc.palier);
      const clientVersement = versementByKey.get(`${d.id}:client`) ?? null;
      const partnerVersement = versementByKey.get(`${d.id}:partenaire`) ?? null;

      rows.push({
        dossier_id: d.id,
        statut_dossier: d.statut,
        source: d.source,
        date_creation: d.date_creation,
        client_nom: paxByDossier.get(d.id) ?? "Client",
        client_montant: clientMontant,
        partenaire_nom: getPartnerLabelFromSource(d.source),
        partenaire_montant: partnerMontant,
        versement_client: clientVersement,
        versement_partenaire: partnerVersement,
      });
    }

    const totals = rows.reduce(
      (acc, r) => {
        const clientMontant = Number(r.client_montant ?? 0);
        const partnerMontant = Number(r.partenaire_montant ?? 0);
        const vc = r.versement_client as { statut?: string } | null;
        const vp = r.versement_partenaire as { statut?: string } | null;
        if (clientMontant > 0 && vc?.statut !== "PAYE") acc.client_a_payer += clientMontant;
        if (partnerMontant > 0 && vp?.statut !== "PAYE") acc.partenaire_a_payer += partnerMontant;
        return acc;
      },
      { client_a_payer: 0, partenaire_a_payer: 0 }
    );

    return NextResponse.json({ rows, totals });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(buildDemoRows());
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const dossierId = String(body.dossier_id ?? "");
  const type = String(body.beneficiaire_type ?? "") as BeneficiaireType;
  if (!dossierId || (type !== "client" && type !== "partenaire")) {
    return NextResponse.json({ error: "dossier_id ou beneficiaire_type invalide" }, { status: 400 });
  }

  const payload = {
    dossier_id: dossierId,
    beneficiaire_type: type,
    beneficiaire_nom: body.beneficiaire_nom ?? null,
    montant: Number(body.montant ?? 0),
    devise: "EUR",
    statut: body.statut ?? "A_PAYER",
    mode_paiement: body.mode_paiement ?? null,
    reference_paiement: body.reference_paiement ?? null,
    bic_code: body.bic_code ?? null,
    banque_nom: body.banque_nom ?? null,
    banque_detectee_auto: body.banque_detectee_auto ?? false,
    date_prevue: body.date_prevue ?? null,
    date_paiement: body.date_paiement ?? null,
    date_reception_virement: body.date_reception_virement ?? null,
    commentaire: body.commentaire ?? null,
  };

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("compta_versements")
      .upsert(payload, { onConflict: "dossier_id,beneficiaire_type" })
      .select("*")
      .single();

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        DEMO_VERSEMENTS.set(`${dossierId}:${type}`, {
          statut: payload.statut,
          mode_paiement: payload.mode_paiement,
          reference_paiement: payload.reference_paiement,
          bic_code: payload.bic_code,
          banque_nom: payload.banque_nom,
          banque_detectee_auto: payload.banque_detectee_auto,
          date_paiement: payload.date_paiement,
          date_reception_virement: payload.date_reception_virement,
          commentaire: payload.commentaire,
        });
        return NextResponse.json({ ...payload, demo: true }, { status: 201 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      DEMO_VERSEMENTS.set(`${dossierId}:${type}`, {
        statut: payload.statut,
        mode_paiement: payload.mode_paiement,
        reference_paiement: payload.reference_paiement,
        bic_code: payload.bic_code,
        banque_nom: payload.banque_nom,
        banque_detectee_auto: payload.banque_detectee_auto,
        date_paiement: payload.date_paiement,
        date_reception_virement: payload.date_reception_virement,
        commentaire: payload.commentaire,
      });
      return NextResponse.json({ ...payload, demo: true }, { status: 201 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Body JSON invalide" }, { status: 400 });
  }
}
